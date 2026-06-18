/**
 * No usamos Firebase / OAuth social.
 * Stub a null para no inicializar firebase (getAuth eager rompía sin API key).
 * Si en el futuro se quiere OAuth, restaurar el original de Ecme.
 */
type OauthSignInProps = {
    setMessage?: (message: string) => void
    disableSubmit?: boolean
}

const OauthSignIn = (_props: OauthSignInProps) => null

export default OauthSignIn
