import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProjectListPage from "./pages/ProjectListPage";
import "./App.css";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectCreatePage from "./pages/ProjectCreatePage";
import ProjectEditPage from "./pages/ProjectEditPage";

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

type ApiProject = {
  id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  startDate: string;
};

type Project = ApiProject & {
  // TODO: APIが工事原価を提供するようになったら、その値を使用する。
  cost: number;
};

type CreateProjectInput = Omit<ApiProject, "id">;

const toProject = (project: ApiProject): Project => ({ ...project, cost: 0 });

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadError("");
        const response = await fetch(`${apiUrl}/projects`);
        if (!response.ok) throw new Error("現場一覧の取得に失敗しました。");

        const data: ApiProject[] = await response.json();
        setProjects(data.map(toProject));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "通信エラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const addProject = async (project: CreateProjectInput) => {
    const response = await fetch(`${apiUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error("現場の登録に失敗しました。入力内容を確認してください。");
    }

    const createdProject: ApiProject = await response.json();
    setProjects((currentProjects) => [...currentProjects, toProject(createdProject)]);
  };

  const updateProject = (updatedProject: Omit<Project, "startDate">) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === updatedProject.id ? { ...project, ...updatedProject } : project,
      ),
    );
  };

  const deleteProject = (id: number) => {
    setProjects((currentProjects) => currentProjects.filter((project) => project.id !== id));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/projects" element={<ProjectListPage projects={projects} isLoading={isLoading} error={loadError} />} />
        <Route path="/projects/:id" element={<ProjectDetailPage projects={projects} deleteProject={deleteProject} />} />
        <Route path="/projects/:id/edit" element={<ProjectEditPage projects={projects} updateProject={updateProject} />} />
        <Route path="/projects/create" element={<ProjectCreatePage addProject={addProject} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
