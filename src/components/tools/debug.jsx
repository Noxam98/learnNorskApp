import {useWordsStore} from "../../store/wordStore.jsx";

const MyDebugComponent = () => {
    // Получаем actions из стора
    const resetAll = useWordsStore(state => state.resetAllDescriptions);
    const reloadAll = useWordsStore(state => state.checkAndLoadAllDescriptions);

    const handleResetAndReload = () => {
        // Сначала сбрасываем
        resetAll();
        // Затем сразу же запускаем проверку, которая найдет все "пустые" слова и поставит их в очередь
        reloadAll();
    }

    return <button onClick={handleResetAndReload}>Сбросить и перезагрузить все описания</button>;
}
export default MyDebugComponent