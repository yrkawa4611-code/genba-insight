import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Genba Insight</h1>

      <button
        onClick={() => navigate("/projects")}
      >
        ログイン
      </button>
    </div>
  );
}