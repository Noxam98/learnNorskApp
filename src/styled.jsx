import { styled } from "styled-components";



export const TextArea = styled.div`
  font-size: 24px;
  border-radius: 4px;
  border: 3px solid #505050;
  padding: 8px;
  max-width: 500px;
  cursor: text;
  &::before{
    content: "${(props) => props.placeholder || ''}";
    color: #00000098;
  }
  margin-bottom: 3px;
`

export const FetchButton = styled.button`
  background-color: #add1f1;
  border: 4px solid #7bb6ea ;
  margin-left: 10px;
  height: 45px;
  border-radius: 10px;
  color: #43423f;
  font-weight: 700;
  cursor: pointer;
  font-size: 16px;
  &:hover{
      background-color: #7bb6ea;
      border: 4px solid #add1f1 ;
  }
` 