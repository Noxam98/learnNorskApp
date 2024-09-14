import styled from "styled-components";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useWordsStore } from "../../store/wordStore";
import exportFromJSON from "export-from-json";

const ToolsWrapper = styled.div`
  display: flex;
  gap: 5px;
  /* height: ; */
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  background-color: #6786a2;
  padding: 5px 5px;
  border-radius: 6px;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  background-color: #fcb563;;
  color: white;  
  font-weight: 700;
  padding: 1px 4px;
  font-size: 13px;
  display: flex;
  border-radius: 6px;
  border: none;
  width: max-content;
  cursor: pointer;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FileInputContainer = styled.div`
  position: relative;
`;

const ToolsButton = styled.button`
  width: max-content;
  /* height: 15px; */
  cursor: no-drop;
  font-weight: 700;

  &:enabled {
    cursor: pointer;
    background-color: #fcb563;
    color: white;
  }

  border: none;
  background-color: aliceblue;
  border-radius: 6px;
  padding: 1px 4px;
  /* cursor: pointer; */
`;

export const WordTools = () => {
  const currentDict = useWordsStore((state) =>
    state.dictList.filter((dict) => dict.dictName === state.currentDictName)
  )[0];
  const deleteChoseWords = useWordsStore((state) => state.deleteChosedWords);
  const importDict = useWordsStore((state) => state.importDict);
  const isSomeSelected = currentDict.words.some(
    (word) => word.techData.isSelected
  );
  return (
    <>
      <ToolsWrapper onClick={(e) => e.stopPropagation()}>
        <ToolsButton onClick={deleteChoseWords} disabled={!isSomeSelected}>
          {" "}
          {interfaceTranslate.ru.delete}
        </ToolsButton>
        <ToolsButton
          onClick={() => {
            exportFromJSON({
              data: currentDict,
              fileName: currentDict.dictName,
              exportType: exportFromJSON.types.json,
            });
          }}
        >
          Экспорт
        </ToolsButton>
        <FileInputContainer>
          <FileInputLabel htmlFor="file-upload">Импорт</FileInputLabel>
          <HiddenFileInput onChange={(e) => {
            const fileReader = new FileReader();
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
            const result = JSON.parse(e.target.result);
            importDict(result)
            };
          }} id="file-upload" type="file" />
        </FileInputContainer>
      </ToolsWrapper>
    </>
  );
};
