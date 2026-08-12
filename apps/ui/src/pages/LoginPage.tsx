import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl, saveToken } from "../auth";

type Props = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const [companyCode, setCompanyCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!companyCode.trim()) {
      setError("会社IDを入力してください。");
      return;
    }

    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyCode: companyCode.trim(),
          password,
        }),
      });

      if (response.status === 401) {
        setError("会社IDまたはパスワードが違います。");
        return;
      }

      if (!response.ok) {
        setError("ログインに失敗しました。入力内容を確認してください。");
        return;
      }

      const data: { token: string } = await response.json();
      saveToken(data.token);
      onLogin();
      navigate("/projects", { replace: true });
    } catch {
      setError("通信に失敗しました。APIが起動しているか確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Genba Insight</h1>
        <p className="subtitle">会社アカウントでログインしてください</p>

        <div>
          <label htmlFor="company-code">会社ID</label>
          <input
            id="company-code"
            value={companyCode}
            onChange={(event) => setCompanyCode(event.target.value)}
            autoComplete="username"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
