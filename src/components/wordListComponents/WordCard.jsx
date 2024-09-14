import styled from "styled-components";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useState } from "react";
import { WordEditWindow } from "./editWordWindow";
import { useWordsStore } from "../../store/wordStore";

export const PartOfSpeech = styled.div`
  position: absolute;
  bottom: 2px;
  font-size: 10px;
  left: 5px;
  border-radius: 5px;
  padding: 0px 5px;
  color: black;
  background-color: ${(
    { pos } //pos - part of speech
  ) =>
    pos === "phrase"
      ? "#c0ebf2"
      : pos === "substantiv"
      ? "#c0f2ca"
      : pos === "verb"
      ? "#eec97a"
      : pos === "adjective"
      ? "#a8aaf7"
      : "#f7ffad"};
  /* &:hover {
    border: 1px solid black;
  } */
`;

export const WordCard = styled.div`
  display: flex;
  color: #ffffff;
  background-color: gray;
  flex-direction: row;
  white-space: nowrap;
  gap: 5px;
  border-radius: 4px;
  width: max-content;
  padding: 3px 8px 14px 10px;
  user-select: none;
  position: relative;
  cursor: pointer;
  &::before {
    position: absolute;
    right: 0px;
    bottom: 0px;
    border-radius: 0 0 4px 4px;
    width: 50px;
    background-color: #eaa340;
    width: 100%;
    height: 8px;
    ${({ isSelected }) => isSelected && 'content: "";'}
  }
  &:hover {
    &::after {
      position: absolute;
      right: 0px;
      bottom: 0px;
      border-radius: 0 0 4px 4px;
      width: 50px;
      background-color: #eaa34026;
      width: 100%;
      height: 8px;
      content: "";
    }
  }
  @media (max-width: 730px) {
    font-size: 12px;
    white-space: normal;
  }
`;

const EditButton = styled.button`
  position: absolute;
  width: 20px;
  height: 20px;
  display: flex;
  right: 5px;
  z-index: 2;
  top: 50%;
  transform: translateY(-50%);
  justify-content: center;
  background-color: #fbe288;
  border: none;
  border-radius: 4px;
  color: #979696;

  cursor: pointer;
  align-items: center;
  &:hover {
    background-color: #f3b20d;
    color: white;
  }
  &::after {
    content: "✎";
    font-size: 15px;
    width: 20px;
    height: 22px;
  }
`;


export const Card = ({ wordItem, languageTranslate }) => {
  // const [copyWordItem, setCopyWordItem] = useState(_.cloneDeep(wordItem));
  const choseWord = useWordsStore((state) => state.choseWord);
  const [isHovered, setIsHovered] = useState(false);
  const [isWordEditing, setIsWordEdititng] = useState(false);
  return (
    <>
      <WordCard
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        isSelected={wordItem.techData.isSelected ? 1 : 0}
        key={wordItem?.id}
        onClick={() => choseWord(wordItem.id)}
      >
        <PartOfSpeech pos={wordItem?.part_of_speech}>
          {wordItem?.part_of_speech}
        </PartOfSpeech>
        <div>{wordItem?.word?.toLowerCase()}</div>-
        <div>{wordItem?.translate[languageTranslate].join(", ")}</div>
        {isHovered && (
          <EditButton
            onClick={(e) => {
              e.stopPropagation();
              setIsWordEdititng(true);
            }}
          />
        )}
      </WordCard>
      {isWordEditing && (
        <WordEditWindow
          wordItem={wordItem}
          languageTranslate={languageTranslate}
          setIsWordEdititng={setIsWordEdititng}
        />
      )}
    </>
  );
};
