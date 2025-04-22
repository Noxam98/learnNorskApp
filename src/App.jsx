import { NavigationBar } from "./components/navigationBar";
import { Outlet } from "react-router";
import styled from "styled-components";
import Footer from "./components/footer.jsx";
import {useAuthStore} from "./store/AuthStore.jsx";
import {useEffect} from "react";


const PageWrapper = styled.section`
    margin-top: 10px;
    padding: 10px;
    background-color: #afb9bf;
    border-radius: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
`

const AppWrapper = styled.section`
    padding: 20px;
    max-width: 1200px;
    width: 100%;
    @media only screen and (max-width : 480px) {
            padding: 10px;   
    }
`

function App() {
    const {isAuthorized, refreshAuthToken} = useAuthStore();
    useEffect(() => {
        if (!isAuthorized){
            refreshAuthToken();
        } else {

        }
    }, [isAuthorized]);
    return (
    <>
        <AppWrapper>
            <NavigationBar/>
            <PageWrapper>
                <Outlet/>
            </PageWrapper>

        </AppWrapper>
        <Footer/>
    </>
  );
}

export default App;
