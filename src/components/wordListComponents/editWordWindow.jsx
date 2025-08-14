import React from "react";
import styled from "styled-components";
import _, { set } from "lodash";
import { useForm, useFieldArray } from "react-hook-form";
import { useWordsStore } from "../../store/wordStore";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";

// --- Стили (Styled Components) ---

const WordEditWindowWrapper = styled.form`
  background-color: #f8f9fa; // Более мягкий фон
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); // Эффект глубины
  position: fixed;
  z-index: 5;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 8px;
  box-sizing: border-box;
  padding: 24px;
  max-height: 90vh; // Используем vh для адаптивности
  overflow-y: auto;
  width: 90%;
  max-width: 450px;
`;

const Title = styled.h2`
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 24px;
  color: #343a40;
  text-align: center;
`;

const FieldGroup = styled.div`
  margin-bottom: 20px;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
`;

const GroupTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
`;

const InputWithButton = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 5px;
`;

const Input = styled.input`
  width: 100%;
  color: #212529;
  padding: 8px 12px;
  background-color: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const ControlsWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`;

const BaseButton = styled.button`
  padding: 10px 16px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SaveButton = styled(BaseButton)`
  color: white;
  background-color: #007bff;
  margin-right: 8px;
`;

const CancelButton = styled(BaseButton)`
  color: #212529;
  background-color: #e9ecef;
`;

const AddButton = styled(BaseButton)`
  color: #007bff;
  background-color: transparent;
  border: 1px dashed #007bff;
  padding: 6px 12px;
  font-size: 14px;
  margin-top: 5px;

  &:hover {
    background-color: #e7f3ff;
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 24px;
  padding: 0 5px;
  line-height: 1;

  &:hover {
    color: #a71d2a;
  }
`;

const DarkBackground = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 3;
  background-color: #000000aa;
  top: 0;
  right: 0;
`;


// --- Вспомогательная функция ---

// Преобразует плоский объект от react-hook-form обратно во вложенную структуру
const unflattenObject = (data) => {
  const result = {};
  for (const key in data) {
    // Используем _.set для создания вложенных свойств по путям типа "translate.en[0]"
    set(result, key, data[key]);
  }
  // react-hook-form может вернуть пустые массивы как undefined, исправим это
  if (result.translate) {
    for(const lang in result.translate) {
      if (!result.translate[lang]) {
        result.translate[lang] = [];
      } else {
        // Убираем пустые строки, которые могут появиться, если пользователь удалил текст из инпута
        result.translate[lang] = result.translate[lang].filter(t => t.trim() !== "");
      }
    }
  }
  return result;
}


// --- Вспомогательный компонент для группы переводов ---

const TranslationGroup = ({ lang, control, register, translations }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `translate.${lang.code}`
  });

  return (
      <FieldGroup>
        <GroupTitle>{lang.name}</GroupTitle>
        {fields.map((field, index) => (
            <Field key={field.id}>
              <Label>{`${lang.code === 'no' ? 'Слово' : translations.translate} #${index + 1}`}</Label>
              <InputWithButton>
                <Input
                    {...register(`translate.${lang.code}.${index}`, { required: lang.code === 'no' ? 'Основное слово не может быть пустым' : false })}
                />
                <DeleteButton type="button" onClick={() => remove(index)}>
                  &times;
                </DeleteButton>
              </InputWithButton>
            </Field>
        ))}
        <AddButton type="button" onClick={() => append("")}>
          {`+ ${translations.add}`}
        </AddButton>
      </FieldGroup>
  );
};


// --- Основной экспортируемый компонент ---

export const WordEditWindow = ({ wordItem, setIsWordEdititng }) => {
  const setNewWord = useWordsStore(store => store.editWord);
  const currentLanguage = useSystemStore((state) => state.currentLanguage);
  const translations = interfaceTranslate[currentLanguage];

  // Используем useForm с defaultValues, передавая исходный объект.
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: _.cloneDeep(wordItem) // Глубокая копия, чтобы не мутировать исходные данные
  });

  // Логика отправки формы
  const onSubmit = (data) => {
    const structuredData = unflattenObject(data);
    // Убедимся, что норвежский перевод не пустой
    if (!structuredData.translate.no || structuredData.translate.no.length === 0) {
      alert("Норвежское слово не может быть пустым.");
      return;
    }
    setNewWord(wordItem.id, structuredData);
    setIsWordEdititng(false);
  };

  // Убедимся, что wordItem.translate не undefined, чтобы избежать ошибок
  if (!wordItem.translate) {
    wordItem.translate = {};
  }

  // ИЗМЕНЕНО: Добавляем норвежский в список языков для редактирования
  const translationLanguages = [
    { code: 'no', name: 'Norwegian' }, // Основное слово
    { code: 'ru', name: translations.russian },
    { code: 'ukr', name: translations.ukrainian },
    { code: 'en', name: translations.english },
    { code: 'lt', name: translations.lithuanian },
    { code: 'pl', name: translations.polish },
  ];

  return (
      <>
        <DarkBackground onClick={() => setIsWordEdititng(false)} />
        <WordEditWindowWrapper onSubmit={handleSubmit(onSubmit)}>
          <Title>{translations.editWord || "Edit Word"}</Title>

          {/* ИЗМЕНЕНО: Убрано отдельное поле для слова, теперь все в группах */}
          <FieldGroup>
            <GroupTitle>{translations.mainInfo || "Main Information"}</GroupTitle>
            <Field>
              <Label>{translations.partOfSpeech || "Part of speech"}</Label>
              <Input {...register("part_of_speech")} />
            </Field>
          </FieldGroup>

          {/* --- Группы переводов (включая норвежский) --- */}
          {translationLanguages.map(lang => (
              <TranslationGroup
                  key={lang.code}
                  lang={lang}
                  control={control}
                  register={register}
                  translations={translations}
              />
          ))}

          <ControlsWrapper>
            <SaveButton type="submit">{translations.save || "Save"}</SaveButton>
            <CancelButton type="button" onClick={() => setIsWordEdititng(false)}>
              {translations.cancel || "Cancel"}
            </CancelButton>
          </ControlsWrapper>

        </WordEditWindowWrapper>
      </>
  );
};