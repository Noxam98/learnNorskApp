import React from 'react';
import {interfaceTranslate} from "../interface/interfaceTranslation.jsx";
import {useSystemStore} from "../store/systemStore.jsx";
import styled from "styled-components";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../hooks/useAuth.js";

const Input = styled.input`
    font-size: 16px;
    width: 100%;
    max-width: 300px;
    padding: 10px;
    border-radius: 16px;
`
const InputsWrapper = styled.form`
    color: white;
    max-width: 400px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background-color: #e2f5ff;
    border-radius: 16px;
`

const PageWrapper = styled.section`
    display: flex;
    width: 100%;
    justify-content: center;
`

const LogoutButton = styled.button`
    font-size: 18px;
    padding: 3px 12px;
    border-radius: 16px;
    //width: 100%;
    //margin: 0 0px;
    max-width: 200px;
    background-color: #f3b930;
    color: #0b0a0a;
    cursor: pointer;
    &:hover {
        background-color: #fda591;
        color: #272727;
    }
`


const FlexWrapper = styled.div`
    display: flex;
    gap: 5px;
    align-items: start;
`

const MyPage = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const navigate = useNavigate()
    const {logout, user} = useAuth()
    const logOut = () => {
        logout()
        navigate("/authorization")
    }

    return (
        <div>
            <div>Hei, {user?.username}.</div>


            <LogoutButton
                onClick={() => logOut()}
            >{interfaceTranslate[currentLanguage].logout}</LogoutButton>
        </div>
    );
};

export default MyPage;