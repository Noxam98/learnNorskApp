import styled from "styled-components";
import { useState } from "react";
import _, { entries, isBoolean } from "lodash";
import { useForm } from "react-hook-form"
import { useWordsStore } from "../../store/wordStore";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";
import {useSystemStore} from "../../store/systemStore.jsx";


const WordEditWindowWrapper = styled.form`
  background-color: aliceblue;
  border: 3px solid black;
  position: absolute;
  z-index: 5;
  left: 50%;
  border-radius: 6px;
  box-sizing: border-box;
  padding: 10px;
  top: 50%;
  max-height: 600px;
  overflow: auto;
  transform: translate(-50%, -50%);
  max-width: 400px;
  
`;

const CancelButton = styled.button`
  padding: 6px;
  font-size: 16px;
  color: white;
  background-color: #f88603;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
`
const SaveButton = styled.button`
  padding: 6px;
  font-size: 16px;
  color: white;
  background-color: #f8c303;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 5px;
`;

const EditItem = styled.input`
  color: black;
  padding: 2px 5px;
  background-color: #b4b6b8;
  border-radius: 6px;
  /* margin-bottom: 10px; */
  min-width: 30px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  //justify-content: start;
  margin-bottom: 10px;
  //gap: 5px;
  background-color: #e0e2e4;
  padding: 5px 6px;
  //justify-content: flex-end;
  border-radius: 6px;
  align-items: start;
  flex-direction: column;
`;

const DarkBackground = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 3;
    background-color: #000000aa;
    top: 0;
    right: 0;
`

const flattenObject = (obj, parentKey = "", result = {}) => {
  _.forOwn(obj, (value, key) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (_.isPlainObject(value)) {
      flattenObject(value, newKey, result);
    } else if (_.isArray(value)) {
      value.forEach((item, index) => {
        if (_.isPlainObject(item) || _.isArray(item)) {
          flattenObject(item, `${newKey}[${index}]`, result);
        } else {
          result[`${newKey}[${index}]`] = item;
        }
      });
    } else {
      result[newKey] = value;
    }
  });
  return result;
};



export const WordEditWindow = ({ wordItem, languageTranslate, setIsWordEdititng }) => {
  const [listToEdit, setListToEdit] = useState(flattenObject(_.cloneDeep(wordItem)));
  const setNewWord = useWordsStore(store => store.editWord)
  const {
    register,
    handleSubmit,
  } = useForm()
  const currentLanguage = useSystemStore((state) => state.currentLanguage);


  const onSubmit = (data) => {
    console.log(data)
    setNewWord(wordItem.id, data)
    setIsWordEdititng(false)
}

  return (
    <>
    <DarkBackground></DarkBackground>
    <WordEditWindowWrapper onSubmit={handleSubmit(onSubmit)}>
      
      {Object.entries(listToEdit).map((entry) => (


        typeof entry[1] !== "boolean" && typeof entry[1] !== "number" && entry[0] !== "id" &&
          <Flex key={entry[0]}>
            <span>{entry[0].includes("translate.ru") && interfaceTranslate[currentLanguage].russian }</span>
            <span>{entry[0].includes("translate.ukr") && interfaceTranslate[currentLanguage].ukrainian}</span>
            <span>{entry[0].includes("translate.en") && interfaceTranslate[currentLanguage].english}</span>
            <span>{entry[0].includes("part_of_speech") && interfaceTranslate[currentLanguage].partOfSpeech}</span>
            <span>{entry[0].includes("translate.lt") && interfaceTranslate[currentLanguage].lithuanian}</span>
            <span>{entry[0].includes("translate.pl") && interfaceTranslate[currentLanguage].polish}</span>
            <span>{entry[0].includes("word") && interfaceTranslate[currentLanguage].word}</span>
            {/*<div>{entry[0]}</div>*/}
            <EditItem type={`${_.isBoolean(entry[1]) ? 'checkbox': ''}`}
              defaultValue={entry[1]}
              {...register(entry[0])}
            />
          </Flex>



      ))}

        <SaveButton type="submit" >{interfaceTranslate[currentLanguage].save}</SaveButton>
        <CancelButton onClick={()=>setIsWordEdititng(false)}>{interfaceTranslate[currentLanguage].cancel}</CancelButton>

      
    </WordEditWindowWrapper>
    </>
  );
};