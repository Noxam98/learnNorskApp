import { WordListPage } from "./pages/WordListPage";
import { NavigationBar } from "./components/navigationBar";
import { Outlet } from "react-router";
import styled from "styled-components";

const PageWrapper = styled.section`
    margin-top: 10px;
        padding: 10px;
    background-color: #babcbe;
    border-radius: 6px;
`


function App() {


  return (
    <>

        <NavigationBar></NavigationBar>
        <PageWrapper>
          <Outlet/>
        </PageWrapper>
       
   
    </>
  );
}

export default App;
