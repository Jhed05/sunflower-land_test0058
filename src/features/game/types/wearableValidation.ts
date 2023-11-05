import { getKeys } from "./craftables";
import { BumpkinItem } from "./bumpkin";
import { GoblinState } from "../lib/goblinMachine";

export const canWithdrawBoostedWearable = (
  wearable: BumpkinItem,
  state?: GoblinState
) => {
  if (!state) return false;

  if (wearable === "Fruit Picker Apron") {
    return getKeys(state.fruitPatches).every(
      (id) => state.fruitPatches[id].fruit === undefined
    );
  }

  if (wearable === "Eggplant Onesie") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Eggplant"
    );
  }

  if (wearable === "Corn Onesie") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Corn"
    );
  }

  if (wearable === "Parsnip") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Parsnip"
    );
  }

  if (wearable === "Sunflower Amulet") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Sunflower"
    );
  }

  if (wearable === "Carrot Amulet") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Carrot"
    );
  }

  if (wearable === "Beetroot Amulet") {
    return getKeys(state.crops).every(
      (id) => state.crops[id].crop?.name !== "Beetroot"
    );
  }

  if (
    wearable === "Green Amulet" ||
    wearable === "Angel Wings" ||
    wearable === "Devil Wings"
  ) {
    return getKeys(state.crops).every((id) => !state.crops[id].crop);
  }

  if (wearable === "Cattlegrim") {
    return getKeys(state.chickens).every((id) => !state.chickens[id].fedAt);
  }

  if (wearable === "Infernal Pitchfork") {
    return getKeys(state.crops).every((id) => !state.crops[id].crop);
  }

  // Safety check
  return false;
};
