// footer.jsx
import styled from "styled-components";
import {interfaceTranslate} from "../interface/interfaceTranslation.jsx";
import {useSystemStore} from "../store/systemStore.jsx";

const FooterWrapper = styled.footer`
    background-color: #2589ff;
    padding: 5px 0;
    border-top: 2px solid #6a8895;
    width: 100%;
    flex-direction: column;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    margin-top: auto;
    color: #f4f4f4;
    text-align: center;
`

const Wrapper = styled.div`
    display: flex;
    //flex-direction: column;
    //width: 100%;
    background-color: #0f949e;
    padding: 7px 10px;
    border-radius: 16px;
    align-items: center;
`

const Link = styled.a`
    text-decoration: none;
    color: white;
    font-weight: bold;
    padding: 2px 5px;
`


const Footer = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);

    return (
        <>

            <FooterWrapper>
                {interfaceTranslate[currentLanguage].foundBugOrIdeas}
                {' '}
                {interfaceTranslate[currentLanguage].contactDeveloper}
                <Wrapper>
                    <Link href="mailto:meliqq98@gmail.com">e-mail</Link>
                    |
                    <Link href="https://t.me/progtt" target="_blank">Telegram</Link>
                </Wrapper>
           </FooterWrapper>
        </>
    );
};

export default Footer;