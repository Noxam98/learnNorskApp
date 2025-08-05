import {
    Routes,
    Route,
    useLocation,
    Navigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import styled from "styled-components";

import { NavigationBar } from "./components/navigationBar";
import Footer from "./components/footer.jsx";

import { WordListPage } from "./pages/WordListPage.jsx";
import { GamePage } from "./pages/GamePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyPage from "./pages/MyPage.jsx";

const PageWrapper = styled.section`
  margin-top: 10px;
  padding: 10px;
  background-color: #afb9bf;
  border-radius: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
`;

const AppWrapper = styled.section`
    padding: 20px;
    max-width: 1200px;
    width: 100%;
    @media only screen and (max-width: 480px) {
        padding: 10px;
    }
`;

const Page = ({ children }) => (
    <motion.div

        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.02, overflow: 'hidden', y: -10 }}
        transition={{ duration: 0.2 }}
    >
        <PageWrapper>{children}</PageWrapper>
    </motion.div>
);

function App() {
    const location = useLocation();

    return (
        <>
            <AppWrapper>
                <NavigationBar />
                <div style={{ position: "relative", minHeight: "400px" }}>
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<Navigate to="/words" />} />
                            <Route path="/words" element={<Page><WordListPage /></Page>} />
                            <Route path="/game" element={<Page><GamePage /></Page>} />
                            <Route path="/authorization" element={<Page><LoginPage /></Page>} />
                            <Route path="/registration" element={<Page><RegisterPage /></Page>} />
                            <Route path="/mypage" element={<Page><MyPage /></Page>} />
                        </Routes>
                    </AnimatePresence>
                </div>
            </AppWrapper>
            <Footer />
        </>
    );
}

export default App;
