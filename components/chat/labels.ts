/** Fired by AskAssistantButton; ChatWidget opens on it. */
export const OPEN_ASSISTANT_EVENT = "dmw:open-assistant";

export type Lang = "en" | "fil";

/**
 * Assistant interface labels. Switching language changes these labels only: earlier messages and
 * source titles stay as they were, and the model answers in the language the visitor writes in.
 */
export const LABELS = {
  en: {
    launcher: "Ask the Assistant",
    subtitle: "DMW source-based guidance",
    close: "Close assistant",
    topic: "Topic",
    langName: "English",
    switchTo: "Switch: Filipino",
    switchAria: "Switch assistant labels to Filipino",
    intro:
      "I answer from DMW's published pages and link my sources. I can't look up your case, so please don't share passport or OEC numbers.",
    tryAsking: "Try asking",
    sources: "Official sources",
    newTab: " (opens in a new tab)",
    searchingEyebrow: "Searching",
    searching: "Looking through DMW sources…",
    cancel: "Cancel",
    answered: "Answer ready.",
    noSourceEyebrow: "No supporting source",
    noSourceTitle: "I could not verify that information.",
    noSourceBody: "Try a more specific question or continue to the official DMW Helpdesk.",
    helpdesk: "Open official helpdesk",
    networkEyebrow: "Connection error",
    networkTitle: "The connection was interrupted.",
    networkBody: "Your question is still here. Try again when your connection is available.",
    busyEyebrow: "Busy",
    busyTitle: "Many people are asking right now.",
    serverEyebrow: "Something went wrong",
    serverTitle: "The assistant couldn't answer.",
    retry: "Try again",
    placeholder: "Ask a question…",
    inputAria: "Your question",
    send: "Send",
    footnote: "Check the official source for current requirements.",
  },
  fil: {
    launcher: "Magtanong sa Assistant",
    subtitle: "Gabay batay sa mga sanggunian ng DMW",
    close: "Isara ang assistant",
    topic: "Paksa",
    langName: "Filipino",
    switchTo: "Palitan: English",
    switchAria: "Gawing English ang mga label ng assistant",
    intro:
      "Sumasagot ako mula sa mga nailathalang pahina ng DMW at may kasamang sanggunian. Hindi ko makikita ang iyong kaso, kaya huwag ibahagi ang passport o OEC number mo.",
    tryAsking: "Subukang itanong",
    sources: "Mga opisyal na sanggunian",
    newTab: " (magbubukas sa bagong tab)",
    searchingEyebrow: "Naghahanap",
    searching: "Hinahanap sa mga sanggunian ng DMW…",
    cancel: "Kanselahin",
    answered: "Handa na ang sagot.",
    noSourceEyebrow: "Walang sumusuportang sanggunian",
    noSourceTitle: "Hindi ko ma-verify ang impormasyong iyan.",
    noSourceBody: "Subukan ang mas tiyak na tanong o pumunta sa opisyal na DMW Helpdesk.",
    helpdesk: "Buksan ang opisyal na helpdesk",
    networkEyebrow: "Problema sa koneksyon",
    networkTitle: "Naputol ang koneksyon.",
    networkBody: "Nandito pa rin ang tanong mo. Subukang muli kapag may koneksyon na.",
    busyEyebrow: "Abala",
    busyTitle: "Maraming nagtatanong ngayon.",
    serverEyebrow: "May nangyaring mali",
    serverTitle: "Hindi nakasagot ang assistant.",
    retry: "Subukang muli",
    placeholder: "Isulat ang tanong…",
    inputAria: "Ang tanong mo",
    send: "Ipadala",
    footnote: "Suriin ang opisyal na sanggunian para sa kasalukuyang requirements.",
  },
} satisfies Record<Lang, Record<string, string>>;

export type Labels = (typeof LABELS)[Lang];
