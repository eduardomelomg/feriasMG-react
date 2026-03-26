import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarPerfilUsuario = async (authUser) => {
      console.log("🕵️ Segurança: Verificando usuário Google:", authUser.email);

      try {
        // 1. Verificação de Domínio
        if (!authUser.email.endsWith("@mendoncagalvao.com.br")) {
          console.error("❌ Segurança: Domínio inválido!", authUser.email);
          alert("ACESSO NEGADO: Use seu e-mail @mendoncagalvao.com.br");
          await supabase.auth.signOut();
          return;
        }

        // 2. Verificação na Tabela
        const { data, error } = await supabase
          .from("usuarios_sistema")
          .select("nome, perfil")
          .eq("email", authUser.email.toLowerCase()) // Forçamos busca em minúsculo
          .single();

        if (error || !data) {
          console.error(
            "❌ Segurança: E-mail não encontrado na tabela 'usuarios_sistema'!",
            authUser.email,
          );
          alert(
            `ACESSO NEGADO: O e-mail ${authUser.email} não está pré-cadastrado no sistema.`,
          );
          await supabase.auth.signOut();
          return;
        }

        console.log("✅ Segurança: Acesso liberado para", data.nome);
        setUsuarioLogado({
          id: authUser.id,
          email: authUser.email,
          nome: data.nome,
          perfil: data.perfil,
          iniciais: data.nome ? data.nome.substring(0, 2).toUpperCase() : "MG",
        });
      } catch (err) {
        console.error("💥 Erro crítico no Segurança:", err.message);
      } finally {
        setCarregando(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        buscarPerfilUsuario(session.user);
      } else {
        setCarregando(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Evento de Auth:", event);
      if (session?.user) {
        buscarPerfilUsuario(session.user);
      } else {
        setUsuarioLogado(null);
        setCarregando(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ usuarioLogado, carregando }}>
      {!carregando && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
