import {Link, useLocation} from "react-router-dom"
import styled from "styled-components"
import { interfaceTranslate } from "../interface/interfaceTranslation"
import LanguageChooser from "./languageChooser.jsx";
import {useSystemStore} from "../store/systemStore.jsx";

const BarWrapper = styled.section`
    height: 50px;
    position: relative;
    border-radius: 6px;
    width: 100%;
    background-color: #afb9bf;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
`


const NavigationLinksWrapper = styled.div`
    display: flex;
    margin: 0;
    padding: 0;
    height: 100%;
`

const NavbarLink = styled(Link)`
    font-size: x-large;
    color: #f5f5f5fa;
    background-color: ${({isActive}) => isActive ? '#37a5ef' : '#9aa3a6'};
    color: ${({isActive}) => isActive ? '#f9f9fa' : '#d6d6d6'};
    padding: 0 7px;
    //border-radius: 6px 6px 0 0 ;
    font-family: Arial, Helvetica, sans-serif;
    text-decoration: none;
    position: relative;
    transition: .3s;
    display: flex;
    align-items: center;

    &:nth-child(2) {
        border-radius: 0 8px 8px 0;
    }

    &:hover {
        background-color: #2d9eea;
    }
`

export const NavigationBar = ()=>{
    const [setCurrentLanguage, currentLanguage] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);

    const location = useLocation()
    return(
        <BarWrapper>
            <LanguageChooser/>
            <NavigationLinksWrapper>
                <NavbarLink isActive={location.pathname === '/words'} to={'words'}>
                    {interfaceTranslate[currentLanguage].navBar.words}
                </NavbarLink>
                < NavbarLink isActive={location.pathname === '/game'} to={'game'}>
                    {interfaceTranslate[currentLanguage].navBar.game}
                </NavbarLink>
            </NavigationLinksWrapper>
        </BarWrapper>
    )
}