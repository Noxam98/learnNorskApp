import React, {useEffect, useState} from 'react';
import styled from "styled-components";

const ErrorCard = styled.div`
    max-width: 300px;
    min-width: 100px;
    background-color: maroon;
    position: fixed;
    bottom: 10px;
    padding: 10px;
    border-radius: 8px;
    left: ${({isVisible}) =>  isVisible? "10px" : "-100%" };
    font-size: 12px;
    color: white;
    font-weight: bold;
    transition: 1s;
`

const Error = ({text, setText}) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(()=>{
        if (text){
            setIsVisible(true)
            setTimeout(()=>{
                setIsVisible(false);
                setTimeout(()=>{
                    setText('')
                },1000)

            }, 5000)
        }
    }, [text])

    return (
        <ErrorCard isVisible={isVisible}>
            {text}
        </ErrorCard>
    );
};

export default Error;