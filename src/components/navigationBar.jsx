import { Link } from "react-router-dom"
import styled from "styled-components"
import { interfaceTranslate } from "../interface/interfaceTranslation"

const BarWrapper = styled.section`
    min-height: 30px;
    border-radius: 6px;
    width: 100%;
    background-color: #afb9bf;
    display: flex;
    align-items: center;
    justify-content: center;
  
`

const NavbarLink = styled(Link)`
 font-size: x-large;
 color: #f5f5f5fa;
 padding: 0 10px;
 border-radius: 6px 6px 0 0 ;
 font-family: Arial, Helvetica, sans-serif;
 text-decoration: none;
 position: relative;
 transition: .3s;
 margin: 10px;
 &::after{
    content: '';
    position: absolute;
    left: 0;
    bottom: -3px;
    background-color: #9e9e9e;
    height: 3px;
    width: 100%;
 }
 /* border-bottom: 3px solid white; */
&:hover,
&:focus{
    background-color: #00b3ff65;

}
&:active{
    color: #9e9e9e;  
};

`

export const NavigationBar = ()=>{
    return(
        <BarWrapper>
            <NavbarLink to={'words'}>
                {interfaceTranslate.ru.navBar.words}
            </NavbarLink>
            <NavbarLink to={'game'}>
                {interfaceTranslate.ru.navBar.game}
            </NavbarLink>
        </BarWrapper>
    )
}