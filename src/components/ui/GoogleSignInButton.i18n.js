import { langGuard } from "../../interface/i18nGuard.js";

// Подписи нативной кнопки Google (в вебе кнопку рисует сам GIS со своими локалями).
// Ключи повторяют варианты GIS: signin_with | signup_with | continue_with.
export const T = langGuard({
    ru: {
        signin_with: "Войти через Google",
        signup_with: "Зарегистрироваться через Google",
        continue_with: "Продолжить с Google",
        failed: "Не удалось войти через Google. Попробуйте ещё раз.",
    },
    ukr: {
        signin_with: "Увійти через Google",
        signup_with: "Зареєструватися через Google",
        continue_with: "Продовжити з Google",
        failed: "Не вдалося увійти через Google. Спробуйте ще раз.",
    },
    en: {
        signin_with: "Sign in with Google",
        signup_with: "Sign up with Google",
        continue_with: "Continue with Google",
        failed: "Google sign-in failed. Please try again.",
    },
    pl: {
        signin_with: "Zaloguj się przez Google",
        signup_with: "Zarejestruj się przez Google",
        continue_with: "Kontynuuj z Google",
        failed: "Logowanie przez Google nie powiodło się. Spróbuj ponownie.",
    },
    lt: {
        signin_with: "Prisijungti su Google",
        signup_with: "Registruotis su Google",
        continue_with: "Tęsti su Google",
        failed: "Nepavyko prisijungti su Google. Bandykite dar kartą.",
    },
    lv: {
        signin_with: "Pieteikties ar Google",
        signup_with: "Reģistrēties ar Google",
        continue_with: "Turpināt ar Google",
        failed: "Neizdevās pieteikties ar Google. Mēģiniet vēlreiz.",
    },
    ar: {
        signin_with: "تسجيل الدخول عبر Google",
        signup_with: "إنشاء حساب عبر Google",
        continue_with: "المتابعة باستخدام Google",
        failed: "تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى.",
    },
}, "GoogleSignInButton");
