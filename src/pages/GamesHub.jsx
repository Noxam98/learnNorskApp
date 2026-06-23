import { Navigate } from "react-router-dom";

// Соло-«Тренировка» удалена — её роль закрывает «Практика по выбранным» во вкладке «Слова» Учёбы.
// Раздел «Игры» теперь только «Онлайн».
export const GamesRedirect = () => <Navigate to="/online" replace />;
