import {
  OWGames,
  OWGamesEvents,
  OWHotkeys
} from "@overwolf/overwolf-api-ts";

import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures, kGameNames } from "../consts";

import { formatResponse } from "../utils";
import axios, { AxiosResponse } from 'axios';

import WindowState = overwolf.windows.enums.WindowStateEx;

// The window displayed in-game while a game is running.
// It listens to all info events and to the game events listed in the consts.ts file
// and writes them to the relevant log using <pre> tags.
// The window also sets up Ctrl+F as the minimize/restore hotkey.
// Like the background window, it also implements the Singleton design pattern.
class InGame extends AppWindow {
  private static _instance: InGame;
  private _gameEventsListener: OWGamesEvents;
  private _eventsLog: HTMLElement;
  private _infoLog: HTMLElement;
  private _gameName: string;
  private _playerName: string;
  private _proxyServerUrl: string;

  private constructor() {
    super(kWindowNames.inGame);

    this._eventsLog = document.getElementById('eventsLog');
    this._infoLog = document.getElementById('infoLog');

    this.setToggleHotkeyBehavior();
    this.setToggleHotkeyText();

    this._proxyServerUrl = "http://localhost:5000";
    //this._proxyServerUrl = "https://ofa-server-r6sh.onrender.com";
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new InGame();
    }

    return this._instance;
  }

  public async run() {
    

    const gameClassId = await this.getCurrentGameClassId();
    this._gameName = kGameNames.get(gameClassId);
    const gameFeatures = kGamesFeatures.get(gameClassId);

    if (gameFeatures && gameFeatures.length) {
      this._gameEventsListener = new OWGamesEvents(
        {
          onInfoUpdates: this.onInfoUpdates.bind(this),
          onNewEvents: this.onNewEvents.bind(this)
        },
        gameFeatures
      );
      this._gameEventsListener.start();
    }

    // User input form
    const userForm = document.getElementById('user-form') as HTMLFormElement;
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(userForm);
  
      await this.aiCall(formData.get('user-input'));
    });
  }
  
  private async updateServerStatus(){
    const statusMsg = document.getElementById("server-message");
    const userInput = document.getElementById("user-input");
    const userButton = document.getElementById("user-button");

    try {
      const url = `${this._proxyServerUrl}/health`;

      const response: AxiosResponse = await axios.get(url);
      const status = response.data;

      if (status.message === "OK") {
        statusMsg.textContent = "Server 🟢";
        if (userInput.hasAttribute('readonly')) {
          userInput.removeAttribute('readonly');
        }

        if (userButton.hasAttribute('disabled')) {
          userButton.removeAttribute('disabled');
        }
      }
    } catch (error) {
      statusMsg.textContent = "Server 🔴";
      if (!userInput.hasAttribute('readonly')) {
        userInput.setAttribute('readonly', 'readonly');
      }

      if (!userButton.hasAttribute('disabled')) {
        userButton.setAttribute('disabled', 'disabled');
      }
    }
  }

  private async sendContextData(context){
    try {
      sessionStorage.setItem('context', JSON.stringify(context));
    } catch (error) {
      //TODO better error handling here
      this.logLine(this._eventsLog, error, true);
    }
  }

  private async aiCall(prompt) {
    try {
      const url = `${this._proxyServerUrl}/ofa/${this._gameName}/${this._playerName}?prompt=${prompt}`;

      let contextData = null;
      if (sessionStorage.getItem('context') !== null){
        contextData = JSON.parse(sessionStorage.getItem('context'));
      }

      const response: AxiosResponse = await axios.post(url, contextData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const text = response.data;
      const newText = formatResponse(text);

      this.logLine(this._eventsLog, newText, true);
    } catch (error) {
      //TODO better error handling here
      this.logLine(this._eventsLog, error, true);
    }
  }

  private async onInfoUpdates(info) {

    if ('gep_internal' in info){
      await this.updateServerStatus();

      // Ping server every 14 mins to keep server alive
      setInterval(async () => {
        await this.updateServerStatus();
      }, 840000);
    }

    switch (this._gameName){
      case "Warframe": {
        if ('game_info' in info){
          this._playerName = info.game_info.username;
        }

        if ('match_info' in info){
          const invData = info.match_info;
          if ('inventory' in invData){
            const invString = invData.inventory;
            let inventoryJSON: any;

            try {
              inventoryJSON = JSON.parse(invString);
            } catch (error) {
                //TODO better error handling here
                console.error('Error parsing JSON:', error);
            }

            // Different object after mission
            if ('InventoryJson' in inventoryJSON){
              const missionData = inventoryJSON.InventoryJson;
              console.log("mission creds: " + missionData.MissionCredits);
            }

            // TODO: add more data to be sent everytime ai makes request
            const priorityData = {
              platinum: inventoryJSON.PremiumCredits,
              credits: inventoryJSON.RegularCredits,
              pending_recipes: inventoryJSON.PendingRecipes,
              player_level: inventoryJSON.PlayerLevel,
              active_quest: inventoryJSON.ActiveQuest,
              last_region_played: inventoryJSON.LastRegionPlayed,
              has_reset_account: inventoryJSON.HasResetAccount,
              story_mode_choice: inventoryJSON.StoryModeChoice,
              played_tutorial: inventoryJSON.PlayedParkourTutorial,
              settings: inventoryJSON.Settings,
                 
              /* Important information but lots of data (more data = slower speed)
              // Complicated data too = AI having hard time understanding
              warframes: inventoryJSON.Suits,
              progress_on_challenges: inventoryJSON.ChallengeProgress,
              recipes: inventoryJSON.Recipes,

              xp_info: inventoryJSON.XPInfo,
              missions: inventoryJSON.Missions,
              resources_inventory: inventoryJSON.MiscItems,
              mods: inventoryJSON.RawUpgrades,
              primary_guns: inventoryJSON.LongGuns,
              */
              
              /* Extra information, not sure if needed (more data = slower speed)
              level_keys: inventoryJSON.LevelKeys,
              quest_keys: inventoryJSON.QuestKeys,
              ships: inventoryJSON.Ships,
              weapon_skins: inventoryJSON.WeaponSkins,
              focus_ability: inventoryJSON.FocusAbility,
              focus_upgrades: inventoryJSON.FocusUpgrades,
              faction_scores: inventoryJSON.FactionScores,
              periodic_mission_completions: inventoryJSON.PeriodicMissionCompletions,
              archwing_enabled: inventoryJSON.ArchwingEnabled,
              archwing_loadout: {
                archwing_melee_weapon: inventoryJSON.SpaceMelee,
                archwing_guns: inventoryJSON.SpaceGuns,
                archwing_suit: inventoryJSON.SpaceSuits,
              },
              kubrow_pets: inventoryJSON.KubrowPets,
              fusion_treasures: inventoryJSON.FusionTreasures,
              upgrades: inventoryJSON.Upgrades,
              affiliations: inventoryJSON.Affiliations,
              */
            };
            
            await this.sendContextData(priorityData);
          }
        }

        break;
      }
      default: {
        // Do stuff
        break;
      }
    }
    
    this.logLine(this._infoLog, info, false);
    console.log(info);
  }

  // Special events will be highlighted in the event log
  private onNewEvents(e) {
    // Prob will never be used for now...
    const shouldHighlight = e.events.some(event => {
      switch (event.name) {
        case 'kill':
        case 'death':
        case 'assist':
        case 'level':
        case 'matchStart':
        case 'match_start':
        case 'matchEnd':
        case 'match_end':
          return true;
      }

      return false
    });
    this.logLine(this._eventsLog, e, shouldHighlight);
  }

  // Displays the toggle minimize/restore hotkey in the window header
  private async setToggleHotkeyText() {
    const gameClassId = await this.getCurrentGameClassId();
    const hotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.toggle, gameClassId);
    const hotkeyElem = document.getElementById('hotkey');
    hotkeyElem.textContent = hotkeyText;
  }

  // Sets toggleInGameWindow as the behavior for the Ctrl+F hotkey
  private async setToggleHotkeyBehavior() {
    const toggleInGameWindow = async (
      hotkeyResult: overwolf.settings.hotkeys.OnPressedEvent
    ): Promise<void> => {
      console.log(`pressed hotkey for ${hotkeyResult.name}`);
      const inGameState = await this.getWindowState();

      if (inGameState.window_state === WindowState.normal ||
        inGameState.window_state === WindowState.maximized) {
        this.currWindow.minimize();
      } else if (inGameState.window_state === WindowState.minimized ||
        inGameState.window_state === WindowState.closed) {
        this.currWindow.restore();
      }
    }

    OWHotkeys.onHotkeyDown(kHotkeys.toggle, toggleInGameWindow);
  }

  // Appends a new line to the specified log - html, play around here
  private logLine(log: HTMLElement, data, highlight) {
    const line = document.createElement('pre');
    line.textContent = JSON.stringify(data);

    if (highlight) {
      line.className = 'highlight';
    }

    // Check if scroll is near bottom
    const shouldAutoScroll =
      log.scrollTop + log.offsetHeight >= log.scrollHeight - 10;

    log.appendChild(line);

    if (shouldAutoScroll) {
      log.scrollTop = log.scrollHeight;
    }
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    const info = await OWGames.getRunningGameInfo();

    return (info && info.isRunning && info.classId) ? info.classId : null;
  }
}

InGame.instance().run();
