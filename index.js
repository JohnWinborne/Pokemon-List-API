// TODO
//  FIX generation and display it
// ADD filtering and add numbers for the selected gen filter
// ADD load more button
// ADD descriptions for stats and more stats
// ADD js for search bar
//store the pokemonResults id  where pokemon get inserted
// make it so you can click a pokemon maybe

//store the pokemonResults id  where pokemon get inserted
const resultsEl = document.getElementById("pokemonResults");
//store the type id where type can change
const typeFilter = document.getElementById("type__filter");

let allPokemon = []; // holds everything I fetch

//the Graphql API url im sending requests to
const ENDPOINT = "https://graphqlpokemon.favware.tech/v8";
//offset tracks where I am in the api list
let offset = 0;
//take is the amount i take from the api
const take = 100;

//function where filters will be added
function applyFilters() {
  //grab filter type
  const selectedType = typeFilter.value;

  let filtered = allPokemon;
// only applies filter if there is a selected type
  if (selectedType) {
// goes through every pokemon in filtered and keeps them if
//  t.name === selected where t is one item inside p.types 
// and som() loops over the array one element at a time
    filtered = filtered.filter((p) =>
      p.types.some((t) => t.name === selectedType)
    );
  }

  renderPokemonList(filtered);
}

//take a list and displays it
function renderPokemonList(list) {
  resultsEl.innerHTML = list.map(renderPokemon).join("");
}


function renderPokemon(p) {
  const num = p.num;
  const gen = "Unknown";
  // if p.types exist map the types to names and joins them with ", " between them
  const types = (p.types || []).map((t) => t.name).join(", ") || "Unknown";
  //use p.baseStatsTotal unless it is null or undefined
  const bst = p.baseStatsTotal ?? "Unknown";
  // check if p.abilities exists then if first exist then get name
  // or return undefined if any of them do not exist
  const ability = p.abilities?.first?.name ?? "Unknown";

  //HTML template string
  return `
    <div class="pokemon__info">
      <h3 class="pokemon__name">${p.species}</h3>
     <p class="pokemon__number">#${num}</p>

      <img src="${p.sprite}" alt="${p.species}" class="pokemon__sprite" 
      onerror="this.onerror=null; this.src='./assets/pokemon-404.svg';"/>
      <ul class="pokemon__meta">
        <li><span class="meta__label">Type:</span> ${types}</li>
        <li><span class="meta__label">Base Stat Total:</span> ${bst}</li>
        <li><span class="meta__label">Primary Ability:</span> ${ability}</li>
      </ul>
    </div>
  `;
}

//async function so i can use await fetch inside
async function loadPokemon() {
  const wanted = take;      // how many NEW pokemon you want to add this click
  const batchSize = 50;     // how many to request from API each loop
  let collected = [];       // holds the NEW filtered pokemon for this call

  try {
    while (collected.length < wanted) {
      const query = `
        {
          getAllPokemon(take: ${batchSize}, offset: ${offset}) {
            species
            num
            sprite
            baseStatsTotal
            types { name }
            abilities { first { name } }
          }
        }
      `;

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        return;
      }

      //use the pokemon array if it exist otherwise use []
      const batch = data.data.getAllPokemon || [];

      // Move offset forward by what we asked for
      offset += batchSize;

      // filter to main dex + remove Pokestar
      const realDex = batch.filter((p) => {
        const n = Number(p.num);
        if (!Number.isFinite(n)) return false;
        if (n < 1 || n > 1025) return false;
        if ((p.species || "").startsWith("Pokestar")) return false;
        return true;
      });

      collected.push(...realDex);

      // safety: stop if API returns nothing
      if (batch.length === 0) break;
    }

    // keep only how many we wanted to add
    collected = collected
      .sort((a, b) => Number(a.num) - Number(b.num))
      .slice(0, wanted);

    //append NEW pokemon into the list from the NEW batch
    allPokemon = allPokemon.concat(collected);

    //sort list so page is always in order
    allPokemon.sort((a, b) => {
      //convert to num
      const an = Number(a.num);
      const bn = Number(b.num);
      //makes sure smaller number comes first
      if (an !== bn) return an - bn;
      //runs only if two pokemon share the same number to sort alphanetically
      return String(a.species).localeCompare(String(b.species));
    });

    applyFilters();
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

//tells the browser to watch this element for something to happen
//with change being the event type and passing the function that should call
//when the event happens
typeFilter.addEventListener("change", applyFilters);

loadPokemon();
