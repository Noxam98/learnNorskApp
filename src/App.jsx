import { WordListPage } from "./pages/WordListPage";
import { NavigationBar } from "./components/navigationBar";
import { Outlet } from "react-router";
import styled from "styled-components";
import {useState} from "react";
import Footer from "./components/footer.jsx";

const PageWrapper = styled.section`
    margin-top: 10px;
    padding: 10px;
    background-color: #afb9bf;
    border-radius: 16px;
    box-sizing: border-box;
    
`

const AppWrapper = styled.section`
    padding: 20px;
    //box-sizing: border-box;
    @media only screen and (max-width : 480px) {
            padding: 10px;   
    }
`

function App() {
    const [languageTranslate, setLanguageTranslate] = useState("ukr");


  return (
    <>

        <AppWrapper>

        <NavigationBar ></NavigationBar>
        <PageWrapper>
          <Outlet/>
        </PageWrapper>
        </AppWrapper>

       <Footer></Footer>
   
    </>
  );
}

export default App;
