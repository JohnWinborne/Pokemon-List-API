// TODO
//  FIX generation and display it
// ADD filtering
// ADD load more button
// ADD descriptions for stats and more stats
//store the pokemonResults id  where pokemon get inserted
// make it so you can click a pokemon maybe

//store the pokemonResults id  where pokemon get inserted
const resultsEl = document.getElementById("pokemonResults");

//the Graphql API url im sending requests to
const ENDPOINT = "https://graphqlpokemon.favware.tech/v8";
//offset tracks where I am in the api list
let offset = 0;
//take is the amount i take from the api
const take = 108;

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
  const wanted = take;
  //gets 50 pokemon at a time
  const batchSize = 50;
  // this holds pokemon
  let collected = [];

  try {
    //keep fetching until i get how many i wanted
    while (collected.length < wanted) {
      //GraphQl query string that requests getAllPokemon
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

      // sends a POST request to GraphQl endpoint
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      //convert the HTTP response to a JS object
      const data = await res.json();

      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        return;
      }

      const batch = data.data.getAllPokemon;

      // Move offset forward by what we actually requested
      offset += batchSize;

      //remove Pokestar and filters the first 1025
      const realDex = batch.filter((p) => {
        const n = Number(p.num);
        //rejects nan, infinity
        if (!Number.isFinite(n)) return false;

        // keep only main-ish dex range
        if (n < 1 || n > 1025) return false;

        // remove obvious non-standard forms in this API
        if ((p.species || "").startsWith("Pokestar")) return false;

        return true;
      });

      //adds all fiiltered Pokemon to the collected array
      collected.push(...realDex);

      //if API ever returns nothing, break to avoid infinite loop
      if (batch.length === 0) break;
    }

    // Sort all collected Pokemon by num, then keeps only the wanted
    collected = collected
      .sort((a, b) => Number(a.num) - Number(b.num))
      .slice(0, wanted);

    //uses renderPokemon to convert to html
    resultsEl.innerHTML += collected.map(renderPokemon).join("");
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

loadPokemon();
