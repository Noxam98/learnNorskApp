import styled from "styled-components";
import { useState } from "react";
import _, { entries, isBoolean } from "lodash";
import { useForm } from "react-hook-form"
import { useWordsStore } from "../../store/wordStore";


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
  left: 50%;
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
  justify-content: start;
  margin-bottom: 10px;
  gap: 5px;
  background-color: #e0e2e4;
  padding: 5px 6px;
  border-radius: 6px;
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
          <Flex key={entry[0]}>
          <EditItem type={`${_.isBoolean(entry[1]) ? 'checkbox': ''}`} 
          defaultValue={entry[1]} 
          {...register(entry[0])}
          />
        </Flex>
      ))}
      <Flex>
        <SaveButton type="submit" >Сохранить</SaveButton>
        <CancelButton onClick={()=>setIsWordEdititng(false)}>Отмена</CancelButton>
      </Flex>
      
    </WordEditWindowWrapper>
    </>
  );
};