// TODO
//  Skele load state
// responsiveness
// add better background maybe

//store the pokemonResults id  where pokemon get inserted
const resultsEl = document.getElementById("pokemonResults");
//store the ids and class where filters can change
const typeFilter = document.getElementById("type__filter");
const genMinEl = document.querySelector(".gen__min");
const genMaxEl = document.querySelector(".gen__max");
const genLabelEl = document.getElementById("generation__range--label");
const searchForm = document.getElementById("search__form");
const searchInput = document.getElementById("search__input");

let searchTerm = ""; // current search text
let allPokemon = []; // holds everything I fetch

//the Graphql API url im sending requests to
const ENDPOINT = "https://graphqlpokemon.favware.tech/v8";
//offset tracks where I am in the api list
let offset = 0;
//take is the amount i take from the api
const take = 1025;

//ranges for generations
const GENERATION_RANGES = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
};

// Keep ONLY one pokemon per dex number so it removes
// extra pikachus for example
function dedupeByDexNumber(list) {
  // seen stores unique values only no dups
  const seen = new Set();
  // goes through each list object and returns false if seen has it already
  // and kicks it out or returns true and keeps the item
  return list.filter((p) => {
    //converts p.num string to a readable number if possible
    const n = Number(p.num);
    if (!Number.isFinite(n)) return false;
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

// Filter list to only pokemon whose dex number falls
// inside gen min and max range
function filterByGeneration(list, minGen, maxGen) {
  //get the dex range for min and max
  const minRange = GENERATION_RANGES[minGen];
  const maxRange = GENERATION_RANGES[maxGen];
  // if missing something return
  if (!minRange || !maxRange) return list;
  //get the min and max values
  const dexMin = minRange[0];
  const dexMax = maxRange[1];

  // adds all numbers that are equal to or greater than min and equal to
  // or less than max
  return list.filter((p) => {
    const n = Number(p.num);
    return Number.isFinite(n) && n >= dexMin && n <= dexMax;
  });
}

// gets the generation values for filtering
function getGenValues() {
  // default if slider elements are missing
  let minGen = Number(genMinEl?.value ?? 1);
  let maxGen = Number(genMaxEl?.value ?? 9);

  // if user drags min past max swap so it stays valid
  if (minGen > maxGen) [minGen, maxGen] = [maxGen, minGen];

  return { minGen, maxGen };
}

// function to update generation if theres a change
function updateGenLabel() {
  const { minGen, maxGen } = getGenValues();
  //update html to updated min generation and max generation
  if (genLabelEl) genLabelEl.textContent = `${minGen} to ${maxGen}`;
}

//function where filters will be added
function applyFilters() {
  //grab filter type
  const selectedType = typeFilter.value;
  const { minGen, maxGen } = getGenValues();
  // start from a deduped list
  let filtered = dedupeByDexNumber(allPokemon);

  // apply generation range filter
  filtered = filterByGeneration(filtered, minGen, maxGen);

  // only applies filter if there is a selected type
  if (selectedType) {
    // this filter returns true when t.name is the same as the selected
    // type for some() element in p.types
    filtered = filtered.filter((p) =>
      p.types.some((t) => t.name === selectedType)
    );
  }

  // apply search bar
  //trim removes whitespace from both ends of a string and turn it into
  //lower case
  const search = (searchTerm || "").trim().toLowerCase();
  // if search actual exists filter true when p.species includes search
  if (search) {
    filtered = filtered.filter((p) =>
      (p.species || "").toLowerCase().includes(search)
    );
  }

  // keep results ordered by dex number
  filtered.sort((a, b) => Number(a.num) - Number(b.num));
  renderPokemonList(filtered);
}

//take a list and displays it
function renderPokemonList(list) {
  // turns the list array of pokemon into one big html string
  // and puts it on the page
  resultsEl.innerHTML = list.map(renderPokemon).join("");
}

function renderPokemon(p) {
  const num = p.num;
  // if p.types exist map the types to names and joins them with ", "
  // between them
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

//async function so i can use await fetch inside to grab pokemon
async function loadPokemon() {
  //add the loading state for spinner
  resultsEl.classList.add("pokemon__loading");

  const wanted = take; // how many NEW pokemon you want to add this click
  const batchSize = 100; // how many to request from API each loop
  // Track which dex numbers we already have
  const seenNums = new Set(allPokemon.map((p) => Number(p.num)));
  try {
    while (seenNums.size < wanted) {
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

      // sends a HTTP request to the api while await pauses the function
      // until the response comes back. res is the response object
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      // reads the response and parses the json into a javascript object
      // so now we can access data.data.getAllPokemon
      const data = await res.json();

      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        return;
      }

      //use the pokemon array if it exist otherwise use []
      const batch = data.data.getAllPokemon || [];

      // Move offset forward by what we asked for
      offset += batchSize;

      // stop if API returns nothing
      if (batch.length === 0) break;

      // go through all pokemon one p at a time
      for (const p of batch) {
        //convert p.num to a number cause it might be a string
        const n = Number(p.num);

        // main dex only
        if (!Number.isFinite(n)) continue;
        if (n < 1 || n > 1025) continue;

        // only add if this dex number is new
        if (!seenNums.has(n)) {
          seenNums.add(n);
          allPokemon.push(p);

          // stop early as soon as we hit the target
          if (seenNums.size >= wanted) break;
        }
      }
    }

    // keep master list sorted
    allPokemon.sort((a, b) => Number(a.num) - Number(b.num));

    applyFilters();
  } catch (err) {
    console.error("Fetch error:", err);
  }
  //remove the spinner
  resultsEl.classList.remove("pokemon__loading");
}

//tells the browser to watch this element for something to happen
//with change being the event type and passing the function that should call
//when the event happens
typeFilter.addEventListener("change", applyFilters);
// sliders should update label + filter live
if (genMinEl)
  genMinEl.addEventListener("input", () => {
    updateGenLabel();
    applyFilters();
  });
if (genMaxEl)
  genMaxEl.addEventListener("input", () => {
    updateGenLabel();
    applyFilters();
  });

// Live search as you type
if (searchInput) {
  searchInput.addEventListener("input", () => {
    // update searchTerm with the searchInput value
    searchTerm = searchInput.value;
    applyFilters();
  });
}

// init label + load data
updateGenLabel();

loadPokemon();
