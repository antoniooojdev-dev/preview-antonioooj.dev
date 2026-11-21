import { Events } from "discord.js";
import { handleVoice } from "../features/tempvoice.js";

export default {
  name: Events.VoiceStateUpdate,
  execute: handleVoice,
};
