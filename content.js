const ROAD_COST = {
  Brick: -1,
  Lumber: -1,
};

const SETTLEMENT_COST = {
  Brick: -1,
  Lumber: -1,
  Grain: -1,
  Wool: -1,
};

const CITY_COST = {
  Grain: -2,
  Ore: -3,
};

const DEVELOPMENT_CARD_COST = {
  Grain: -1,
  Wool: -1,
  Ore: -1,
};

// Options for the observer (which mutations to observe)
const config = {
  attributes: true,
  childList: true,
  subtree: true,
};

eventsMap = new Map();
let playerName;
let opponentName;
let opponentResources = {
  Lumber: 0,
  Brick: 0,
  Grain: 0,
  Wool: 0,
  Ore: 0,
};

console.log("Waiting for game feed container...");

// ---------------- MUTATION CALLBACK ----------------
const callback = (mutationList) => {
  for (const mutation of mutationList) {
    // Only care about added nodes
    if (mutation.type !== "childList") continue;

    mutation.addedNodes.forEach((node) => {
      // Ensure this is an element
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      // Each feed entry wrapper has a unique id
      const eventId = node.dataset?.index;
      if (!eventId) return;

      // Find the feed message inside the wrapper
      const feedMessage = node.querySelector('div[class*="feedMessage"]');
      if (!feedMessage) return;

      // Find the message content span
      const messageSpan = feedMessage.querySelector(
        'span[class*="messagePart"]',
      );
      if (!messageSpan) return;

      //Build message
      let message = "";

      messageSpan.childNodes.forEach((child) => {
        // Plain text nodes
        if (child.nodeType === Node.TEXT_NODE) {
          message += child.textContent;
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          child.tagName === "SPAN"
        ) {
          message += child.innerText;
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          child.tagName === "IMG"
        ) {
          message += child.alt;
        }
      });

      message = message.trim();

      //Insert event into events map
      if (!eventsMap.has(eventId)) {
        eventsMap.set(eventId, message);
        updateResources(opponentName, opponentResources, message);

        console.log(opponentResources);
        chrome.storage.local.set(
          { opponentResources: opponentResources },
          () => {
            console.log("Wrote to storage:", opponentResources); // Confirm the write happened
          },
        );
      }
    });
  }
};

// Create observer
const observer = new MutationObserver(callback);

// Get the game events feed and player/opponent usernames
const waitForElement = setInterval(() => {
  const gameFeedsContainer = document.querySelector(
    '[class*="gameFeedsContainer"]',
  );

  if (!gameFeedsContainer) return;

  const children = Array.from(gameFeedsContainer.children);

  playerName = document.querySelector('div[class^="usernameLarge"]')
    .childNodes[0].textContent;

  opponentName = document
    .querySelector('div[class^="opponentPlayerRow"]')
    ?.querySelector('div[class*="playerInformation"]')
    ?.querySelector('div[class^="informationWrapper"]')
    ?.childNodes[0]?.querySelector('div[class^="username"]')
    ?.childNodes[0].textContent;

  const targetNode = children.find((child) =>
    child.querySelector('[class*="virtualContainer"]'),
  );

  if (!targetNode || !playerName || !opponentName) return;

  // Stop polling
  clearInterval(waitForElement);
  // Start observing
  observer.observe(targetNode, config);

  console.log("Observer attached!");
}, 500);

//Takes an event message and updates the resources of the given player
function updateResources(username, resources, eventString) {
  console.log(eventString);

  if (eventString.length == 0) return;

  const eventStringList = eventString.split(" ");
  const action = eventStringList[1];

  switch (action) {
    //Resources gained from dice roll
    //"[PLAYER] got [RESOURCES]"
    case "got": {
      if (eventStringList[0] != username) break;
      const delta = {};

      for (const resource of eventStringList.slice(2, eventStringList.length)) {
        delta[resource] = (delta[resource] ?? 0) + 1;
      }

      applyDelta(resources, delta);
      break;
    }

    case "received": {
      if (eventStringList[0] != username) break;
      const delta = {};

      for (const resource of eventStringList.slice(4, eventStringList.length)) {
        delta[resource] = (delta[resource] ?? 0) + 1;
      }

      applyDelta(resources, delta);
      break;
    }

    // Handles 1. Knight Steal, 2. Monopoly Steal
    //1. "[PLAYER1] stole [RESOURCES] from [PLAYER2]"
    //2. "[PLAYER] stole [RESOURCES]"
    case "stole": {
      const multiplier = username === eventStringList[0] ? 1 : -1;

      const start_index = eventStringList.indexOf("stole") + 1;
      const end_index = eventStringList.includes("from")
        ? eventStringList.indexOf("from")
        : eventStringList.length;

      const delta = {};

      for (const resource of eventStringList.slice(start_index, end_index)) {
        delta[resource] = (delta[resource] ?? 0) + multiplier;
      }

      applyDelta(resources, delta);
      break;
    }

    //Player trades with bank or player
    // 1. "[PLAYER1] gave bank [RESOURCES] and took [RESOURCES]"
    // 2. "[PLAYER1] gave [RESOURCES] and got [RESOURCES] from [PLAYER2]"
    case "gave": {
      if (!eventStringList.includes(username)) break;
      const delta = {};
      //Player trade with bank
      if (eventStringList.includes("bank")) {
        let start_index = eventStringList.indexOf("bank") + 1;
        let end_index = eventStringList.indexOf("and");
        let took_index = eventStringList.indexOf("took");

        for (const resource of eventStringList.slice(start_index, end_index)) {
          delta[resource] = (delta[resource] ?? 0) - 1;
        }
        for (const resource of eventStringList.slice(
          took_index + 1,
          eventStringList.length,
        )) {
          delta[resource] = (delta[resource] ?? 0) + 1;
        }
      }
      //Player trades with player, use the multiplier to swap cards coming in/out depending if username is PLAYER1 or PLAYER2
      else {
        const multiplier = username === eventStringList[0] ? 1 : -1;

        let start_index = eventStringList.indexOf("gave") + 1;
        let end_index = eventStringList.indexOf("and");
        for (const resource of eventStringList.slice(start_index, end_index)) {
          delta[resource] = (delta[resource] ?? 0) - multiplier;
        }

        start_index = eventStringList.indexOf("got") + 1;
        end_index = eventStringList.indexOf("from");
        for (const resource of eventStringList.slice(start_index, end_index)) {
          delta[resource] = (delta[resource] ?? 0) + multiplier;
        }
      }
      applyDelta(resources, delta);
      break;
    }

    //Player uses year of plenty
    //"[PLAYER1] took from bank [RESOURCES]"
    case "took": {
      if (eventStringList[0] != username) break;
      const delta = {};

      for (const resource of eventStringList.slice(4, eventStringList.length)) {
        delta[resource] = (delta[resource] ?? 0) + 1;
      }

      applyDelta(resources, delta);
      break;
    }

    //Player builds a settlement/road/city
    //"[PLAYER1] built a [Settlement/Road/City]"
    case "built": {
      if (eventStringList[0] != username) break;
      if (eventStringList[3] === "Road") {
        applyDelta(resources, ROAD_COST);
        break;
      } else if (eventStringList[3] === "Settlement") {
        applyDelta(resources, SETTLEMENT_COST);
        break;
      } else if (eventStringList[3] === "City") {
        applyDelta(resources, CITY_COST);
        break;
      }
      break;
    }

    //Player buys a dev card
    //"[PLAYER1] bought Development Card"
    case "bought": {
      if (eventStringList[0] === username) {
        applyDelta(resources, DEVELOPMENT_CARD_COST);
        break;
      }
      break;
    }
  }

  return resources;
}

function applyDelta(resources, delta) {
  for (const [resource, change] of Object.entries(delta)) {
    resources[resource] = (resources[resource] ?? 0) + change;
  }
}
