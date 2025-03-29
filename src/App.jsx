import { WordListPage } from "./pages/WordListPage";
import { NavigationBar } from "./components/navigationBar";
import { Outlet } from "react-router";
import styled from "styled-components";
import {useState} from "react";

const PageWrapper = styled.section`
    margin-top: 10px;
    padding: 10px;
    background-color: #afb9bf;
    border-radius: 6px;
`


function App() {
    const [languageTranslate, setLanguageTranslate] = useState("ukr");


  return (
    <>

        <NavigationBar ></NavigationBar>
        <PageWrapper>
          <Outlet/>
        </PageWrapper>
       
   
    </>
  );
}

export default App;
