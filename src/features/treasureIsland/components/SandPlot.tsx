import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "features/game/GameProvider";
import { useActor, useInterpret, useSelector } from "@xstate/react";
import { SUNNYSIDE } from "assets/sunnyside";
import { PIXEL_SCALE } from "features/game/lib/constants";
import Spritesheet, {
  SpriteSheetInstance,
} from "components/animation/SpriteAnimator";
import { ToastContext } from "features/game/toast/ToastQueueProvider";

import shadow from "assets/npcs/shadow.png";
import xMark from "assets/decorations/flag.png";

import { ITEM_DETAILS } from "features/game/types/images";
import { InventoryItemName } from "features/game/types/game";
import { setImageWidth } from "lib/images";
import classNames from "classnames";

import { Modal } from "react-bootstrap";
import { Revealed } from "features/game/components/Revealed";
import {
  MachineState,
  SandPlotContext,
  sandPlotMachine,
} from "../lib/sandPlotMachine";
import { Button } from "components/ui/Button";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";

type TreasureReward = {
  discovered: InventoryItemName | null;
  dugAt: number;
};

const Reward: React.FC<{ reward?: TreasureReward }> = ({ reward }) => {
  if (!reward || !reward.discovered) return null;

  return (
    <div
      id="reward-comp"
      className="absolute h-full w-full flex justify-center items-end cursor-pointer"
      style={{ bottom: 16 }}
    >
      <img
        src={ITEM_DETAILS[reward.discovered].image}
        className={classNames("img-highlight-heavy", {
          "treasure-reward": reward.discovered,
        })}
        onLoad={(e) => setImageWidth(e.currentTarget)}
      />
    </div>
  );
};

const NoSandShovel: React.FC<{ show: boolean }> = ({ show }) => (
  <>
    <img
      src={SUNNYSIDE.icons.cancel}
      className={classNames(
        "transition-opacity absolute z-20 pointer-events-none",
        {
          "opacity-100": show,
          "opacity-0": !show,
        }
      )}
      style={{
        width: `${PIXEL_SCALE * 8}px`,
        top: `${PIXEL_SCALE * 5}px`,
        left: `${PIXEL_SCALE * 4}px`,
      }}
    />
    <img
      src={ITEM_DETAILS["Sand Shovel"].image}
      className={classNames(
        "transition-opacity absolute z-10 pointer-events-none",
        {
          "opacity-100": show,
          "opacity-0": !show,
        }
      )}
      style={{
        width: `${PIXEL_SCALE * 8}px`,
        top: `${PIXEL_SCALE * 3}px`,
        left: `${PIXEL_SCALE * 9}px`,
      }}
    />
  </>
);

const GoblinEmotion: React.FC<{ treasure: InventoryItemName | null }> = ({
  treasure,
}) => {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setFadeIn(true);
    }, 100);
  }, []);

  return (
    <img
      src={treasure ? SUNNYSIDE.icons.happy : SUNNYSIDE.icons.sad}
      className={classNames("absolute transition-opacity duration-500 z-50", {
        "opacity-0": !fadeIn,
        "opacity-100": fadeIn,
      })}
      onLoad={(e) => setImageWidth(e.currentTarget)}
      style={{ top: "-48px", left: "-35px" }}
    />
  );
};

const isDug = (state: MachineState) => state.matches("dug");
const isTreasureNotFound = (state: MachineState) =>
  state.matches("treasureNotFound");
const isTreasureFound = (state: MachineState) => state.matches("treasureFound");
const isIdle = (state: MachineState) => state.matches("idle");
const isNoShovel = (state: MachineState) => state.matches("noShovel");
const isFinishing = (state: MachineState) => state.matches("finishing");
const discovered = (state: MachineState) => state.context.discovered;

export const SandPlot: React.FC<{
  id: number;
  shownMissingShovelModal: boolean;
  onMissingShovelAcknowledge: () => void;
}> = ({ id, shownMissingShovelModal, onMissingShovelAcknowledge }) => {
  const goblinDiggingRef = useRef<SpriteSheetInstance>();
  const { setToast } = useContext(ToastContext);

  const { gameService, selectedItem } = useContext(Context);
  const [gameState] = useActor(gameService);

  const { treasureIsland } = gameState.context.state;
  const reward = treasureIsland?.holes?.[id];

  const machineContext: Partial<SandPlotContext> = { ...reward, id };
  const sandPlotService = useInterpret(sandPlotMachine, {
    context: machineContext,
  });

  const idle = useSelector(sandPlotService, isIdle);
  const treasureFound = useSelector(sandPlotService, isTreasureFound);
  const treasureNotFound = useSelector(sandPlotService, isTreasureNotFound);
  const dug = useSelector(sandPlotService, isDug);
  const noShovel = useSelector(sandPlotService, isNoShovel);
  const finishing = useSelector(sandPlotService, isFinishing);
  const discoveredItem = useSelector(sandPlotService, discovered);

  const [showHoverState, setShowHoverState] = useState(false);
  const [showGoblinEmotion, setShowGoblinEmotion] = useState(false);
  const [showMissingShovelModal, setShowMissingShovelModal] = useState(
    shownMissingShovelModal
  );

  const hasSandShovel =
    selectedItem === "Sand Shovel" &&
    gameState.context.state.inventory["Sand Shovel"]?.gte(1);

  useEffect(() => {
    // If no treasure is found, move gameMachine back into playing state and
    if (treasureNotFound) {
      gameService.send("CONTINUE");
      sandPlotService.send("ACKNOWLEDGE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treasureNotFound]);

  const handleNoShovel = async () => {
    if (!shownMissingShovelModal) {
      // To avoid modal overload, the first time a player clicks on a sand plot
      // with no sand shovel selected we will show a modal informing them they need a shovel.
      setShowMissingShovelModal(true);
      return;
    }

    // Subsequent clicks with no shovel will just show a popover.
    sandPlotService.send("NO_SHOVEL");
  };

  const handleDig = () => {
    if (!hasSandShovel) {
      handleNoShovel();
      return;
    }

    gameService.send("REVEAL", {
      event: {
        type: "treasure.dug",
        id,
        createdAt: new Date(),
      },
    });

    sandPlotService.send("DIG");
  };

  const handleAcknowledgeTreasureFound = () => {
    if (!discoveredItem) return;

    setToast({
      icon: ITEM_DETAILS[discoveredItem].image,
      content: `+1`,
    });

    sandPlotService.send("ACKNOWLEDGE");
  };

  const handleAcknowledgeNoSandShovel = () => {
    setShowMissingShovelModal(false);
    onMissingShovelAcknowledge();
  };

  const handleTreasureCheck = () => {
    // Each time the sprite sheet gets to the 10th frame (shovel up)
    // If reward has returned then stop sprite here.
    if (reward !== undefined) {
      goblinDiggingRef.current?.pause();
      setShowGoblinEmotion(true);

      setTimeout(() => {
        sandPlotService.send("FINISH_DIGGING", {
          discovered: reward.discovered,
          dugAt: reward?.dugAt,
        });
      }, 1000);
    }
  };

  if (dug || treasureFound) {
    return (
      <>
        <div className="w-full h-full">
          <img
            src={SUNNYSIDE.soil.sand_dug}
            className="absolute"
            style={{
              width: `${PIXEL_SCALE * 16}px`,
              top: `${PIXEL_SCALE * 2}px`,
            }}
          />
        </div>
        <Modal
          centered
          show={treasureFound}
          onHide={handleAcknowledgeTreasureFound}
        >
          <CloseButtonPanel onClose={handleAcknowledgeTreasureFound}>
            <Revealed onAcknowledged={handleAcknowledgeTreasureFound} />
          </CloseButtonPanel>
        </Modal>
      </>
    );
  }

  if (showMissingShovelModal) {
    return (
      <Modal centered show onHide={handleAcknowledgeNoSandShovel}>
        <CloseButtonPanel
          title="No Sand Shovel!"
          onClose={handleAcknowledgeNoSandShovel}
        >
          <div className="p-2 pt-0 mb-2 flex flex-col items-center space-y-2">
            <img
              src={ITEM_DETAILS["Sand Shovel"].image}
              alt="Sand Shovel"
              onLoad={(e) => setImageWidth(e.currentTarget)}
            />
            <p>
              You need to have a Sand Shovel equipped to be able to dig for
              treasure!
            </p>
            <p>
              If you need to purchase one, you can head to the Treasure Shop at
              the southern end of the island.
            </p>
          </div>
          <Button onClick={handleAcknowledgeNoSandShovel}>Got it</Button>
        </CloseButtonPanel>
      </Modal>
    );
  }

  const gameMachinePlaying = gameState.matches("playing");
  const showShovelGoblin = !idle && !dug && !noShovel;
  const showSelectBox =
    showHoverState && !showShovelGoblin && gameMachinePlaying && hasSandShovel;

  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setShowHoverState(true)}
      onMouseLeave={() => setShowHoverState(false)}
    >
      <NoSandShovel show={noShovel} />
      <div
        className={classNames("w-full h-full cursor-pointer absolute", {
          "pointer-events-none": !gameMachinePlaying,
        })}
        onClick={handleDig}
      >
        <img
          src={SUNNYSIDE.ui.select_box}
          className={classNames("absolute z-40 cursor-pointer", {
            "opacity-100": showSelectBox,
            "opacity-0": !showSelectBox,
          })}
          style={{
            width: `${PIXEL_SCALE * 16}px`,
          }}
        />
      </div>

      {!showShovelGoblin &&
        gameState.context.state.treasureIsland?.rareTreasure?.holeId === id && (
          <img
            src={xMark}
            style={{
              width: `${PIXEL_SCALE * 16}px`,
              bottom: `${PIXEL_SCALE * 2.5}px`,
            }}
            className="pointer-events-none absolute"
          />
        )}

      {showShovelGoblin && (
        <>
          <div
            className={classNames("w-full h-full absolute transition-opacity", {
              "opacity-100": !finishing,
              "opacity-0": finishing,
            })}
          >
            {reward && showGoblinEmotion && (
              <GoblinEmotion treasure={reward.discovered} />
            )}
            <Spritesheet
              className="absolute group-hover:img-highlight pointer-events-none z-50"
              style={{
                width: `${PIXEL_SCALE * 33}px`,
                imageRendering: "pixelated",
                bottom: "19px",
                left: "-56px",
              }}
              getInstance={(spritesheet) => {
                goblinDiggingRef.current = spritesheet;
              }}
              image={SUNNYSIDE.npcs.goblin_treasure_sheet}
              widthFrame={33}
              heightFrame={28}
              fps={14}
              steps={13}
              endAt={13}
              direction={`forward`}
              autoplay
              loop
              onEnterFrame={[
                {
                  frame: 10,
                  callback: handleTreasureCheck,
                },
              ]}
            />
            <img
              src={shadow}
              className="absolute"
              style={{
                width: `${PIXEL_SCALE * 15}px`,
                left: `-37px`,
                bottom: `16px`,
              }}
            />
          </div>
          <div className="absolute w-full h-full">
            <img
              src={SUNNYSIDE.soil.sand_dug}
              className="absolute"
              style={{
                width: `${PIXEL_SCALE * 16}px`,
                top: `${PIXEL_SCALE * 2}px`,
              }}
            />
            <Reward reward={reward} />
          </div>
        </>
      )}
    </div>
  );
};