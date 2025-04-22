import React, {useEffect} from 'react';
import api from "../components/tools/api.js";
import {useAuth} from "../hooks/useAuth.js";
import styled from "styled-components";
import {useSystemStore} from "../store/systemStore.jsx";
import {interfaceTranslate} from "../interface/interfaceTranslation.jsx";
import {Link, useNavigate} from "react-router-dom";

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

const SubmitButton = styled.button`
    font-size: 24px;
    padding: 3px 20px;
    border-radius: 16px;
    width: 100%;
    //margin: 0 0px;
    max-width: 200px;
    background-color: #baf9ff;
    color: #2d5bb6;

    &:hover {
        background-color: #65b5a8;
        color: #c4e7ff;
    }
`

const Error = styled.div`
    color: crimson;
    
`

const NavLink = styled(Link)`
    font-size: ${({isActive}) => isActive? '28px' : '14px'};
    text-decoration: none;
    color: #555555;
    background-color: ${({isActive}) => isActive ? '#37a5ef' : 'transparent'};
    color: ${({isActive}) => isActive ? '#eeeef1' : '#135e7e'};
    padding: ${({isActive}) => isActive ? '10px' : '4px'};
    
    border-radius: 16px;
    transition: .3s;
    &:hover {
        cursor: ${({isActive}) => isActive ? 'inherit' : 'pointer'};
        filter: ${({isActive}) => isActive ? 'none' : 'invert()'};
    }
`

const FlexWrapper = styled.div`
    display: flex;
    gap: 5px;
    align-items: start;
`




const LoginPage = () => {
    const { login, isLoading, authorizationError, isAuthenticated } = useAuth();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const navigate = useNavigate();
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/mypage')
        }
    }, [isAuthenticated])


    const LoginSubmit = async (e) => {
        e.preventDefault();
        await login(username, password);

    };

    return (

        <PageWrapper>

            <InputsWrapper onSubmit={LoginSubmit}>
                <FlexWrapper>
                    <NavLink isActive={true}>{interfaceTranslate[currentLanguage].authorization}</NavLink>
                    <NavLink to={'/registration'} isActive={false}>{interfaceTranslate[currentLanguage].registration}</NavLink>
                </FlexWrapper>
                <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={interfaceTranslate[currentLanguage].username}
                />
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={interfaceTranslate[currentLanguage].password}

                />
                <SubmitButton disabled={isLoading}>
                    {isLoading ? interfaceTranslate[currentLanguage].authorization+'...' : interfaceTranslate[currentLanguage].login}
                </SubmitButton>
                {authorizationError && <Error className="error">{authorizationError}</Error>}
            </InputsWrapper>

        </PageWrapper>

    );
};

export default LoginPage;