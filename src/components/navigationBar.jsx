import {Link, useLocation} from "react-router-dom"
import styled from "styled-components"
import { interfaceTranslate } from "../interface/interfaceTranslation"
import LanguageChooser from "./languageChooser.jsx";
import {useSystemStore} from "../store/systemStore.jsx";
import {useAuth} from "../hooks/useAuth.js";
import AuthIcon from "../assets/AuthIcon.jsx";
const BarWrapper = styled.section`
    height: 50px;
    position: relative;
    border-radius: 16px;
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
    align-items: stretch;
`

const NavbarLink = styled(Link)`
    font-size: x-large;
    background-color: ${({isActive}) => isActive ? '#37a5ef' : '#9aa3a6'};
    color: ${({isActive}) => isActive ? '#f9f9fa' : '#d6d6d6'};
    padding: 0 7px;
    font-family: Arial, Helvetica, sans-serif;
    text-decoration: none;
    position: relative;
    transition: .3s;
    display: flex;
    align-items: center;

    &:last-child {
        border-radius: 0 16px 16px 0;
    }

    &:hover {
        background-color: #2d9eea;
    }
`

const LoggedIndicator = styled(Link)`
    width: 35px;
    border-radius: 0 0 0 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: .3s;
    background-color: ${({isActive}) => isActive ? '#37a5ef' : '#9aa3a6'};

    &:hover {
        background-color: #2d9eea;
    }
`

export const NavigationBar = ()=>{
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const { isAuthenticated } = useAuth();

    const location = useLocation()
    return(
        <BarWrapper>
            <LanguageChooser/>
            <NavigationLinksWrapper>
                <LoggedIndicator to={'/authorization'}
                                 isActive={
                    location.pathname === '/authorization' ||
                    location.pathname === '/registration' ||
                    location.pathname === '/mypage'
                }>
                    <AuthIcon color={isAuthenticated ? '#37ef3a' : '#000000'} />
                </LoggedIndicator>
                <NavbarLink isActive={location.pathname === '/words'} to={'words'}>
                    {interfaceTranslate[currentLanguage].navBar.words}
                </NavbarLink>
                <NavbarLink isActive={location.pathname === '/game'} to={'game'}>
                    {interfaceTranslate[currentLanguage].navBar.game}
                </NavbarLink>
            </NavigationLinksWrapper>
        </BarWrapper>
    )
}