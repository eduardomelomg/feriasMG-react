// src/contexts/AuthContext.jsx
import { createContext, useState, useContext } from "react";

// 1. Criamos o contexto vazio
const AuthContext = createContext();

// 2. Criamos o Provedor (quem vai abraçar o nosso app e fornecer os dados)
export function AuthProvider({ children }) {
  // Vamos simular um usuário logado.
  // Mais tarde, esses dados virão do login real do Google/Firebase.
  const [usuarioLogado, setUsuarioLogado] = useState({
    nome: "Eduardo Melo",
    email: "eduardo.melo@mendonca...",
    perfil: "Admin TI", // Perfis disponíveis: 'Admin TI', 'Gestão DP', 'Coordenador', 'Colaborador'
    iniciais: "E",
  });

  return (
    <AuthContext.Provider value={{ usuarioLogado, setUsuarioLogado }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
