import styled, { keyframes } from "styled-components"

const animateLoader = keyframes`
    0% {
    background-color: #737373;
    border-color: #9e9e9e;
    width: 300px;
    }
    50%{
        background-color: #9e9e9e;
        border-color: #dfdbdb;
        width: 280px;
    }

    100% {
        background-color: #737373;
        border-color: #9e9e9e;
        width: 300px;
    }
`;

const LoaderWrapper = styled.div`
    border: 3px solid black;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    position: fixed;
    z-index: 10;
    width: 300px;
    height: 150px;
    background-color: #737373;
    border-radius: 16px;
    animation: ${animateLoader} 3s linear infinite;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 20px;
` 

export const Loader = ({text})=>{
    return(
        <LoaderWrapper>
            {text || 'Loading..'}
        </LoaderWrapper>
    )
}