import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { apiUrl, authFetch, clearToken, getToken } from "./auth";
import RequireAuth from "./components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import ProjectListPage from "./pages/ProjectListPage";
import "./App.css";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectCreatePage from "./pages/ProjectCreatePage";
import ProjectEditPage from "./pages/ProjectEditPage";

type Project = {
  id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  startDate: string;
  cost: number;
};

type CreateProjectInput = Omit<Project, "id" | "cost">;
type UpdateProjectInput = Omit<Project, "id" | "cost">;

function AppRoutes() {
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!isAuthenticated || !location.pathname.startsWith("/projects")) {
      return;
    }

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await authFetch(`${apiUrl}/projects`);

        if (!response.ok) {
          throw new Error("現場一覧の取得に失敗しました。");
        }

        const data: Project[] = await response.json();
        setProjects(data);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "通信エラーが発生しました。",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, [isAuthenticated, location.pathname]);

  const addProject = async (project: CreateProjectInput) => {
    const response = await authFetch(`${apiUrl}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error(
        "現場の登録に失敗しました。入力内容を確認してください。",
      );
    }

    const createdProject: Project = await response.json();

    setProjects((currentProjects) => [
      ...currentProjects,
      createdProject,
    ]);
  };

  const updateProject = async (
  id: number,
  project: UpdateProjectInput,
) => {
  const response = await authFetch(`${apiUrl}/projects/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(project),
  });

  if (!response.ok) {
    throw new Error(
      "現場の更新に失敗しました。入力内容を確認してください。",
    );
  }

  const updatedProject: Project = await response.json();

  setProjects((currentProjects) =>
    currentProjects.map((project) =>
      project.id === updatedProject.id
        ? updatedProject
        : project,
    ),
  );
};

  const updateProjectCost = useCallback(
    (id: number, cost: number) => {
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === id
            ? { ...project, cost }
            : project,
        ),
      );
    },
    [],
  );

  const deleteProject = async (id: number) => {
  const response = await authFetch(`${apiUrl}/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("現場の削除に失敗しました。");
  }

  setProjects((currentProjects) =>
    currentProjects.filter(
      (project) => project.id !== id,
    ),
  );
};

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
  };

  return (
    <Routes>
        <Route
          path="/"
          element={<LoginPage onLogin={() => setIsAuthenticated(true)} />}
        />

        <Route
          path="/projects"
          element={
            <RequireAuth>
              <ProjectListPage
                projects={projects}
                isLoading={isLoading}
                error={loadError}
                onLogout={handleLogout}
              />
            </RequireAuth>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <ProjectDetailPage
                projects={projects}
                deleteProject={deleteProject}
                updateProjectCost={updateProjectCost}
              />
            </RequireAuth>
          }
        />

        <Route
          path="/projects/:id/edit"
          element={
            <RequireAuth>
              <ProjectEditPage
                projects={projects}
                updateProject={updateProject}
              />
            </RequireAuth>
          }
        />

        <Route
          path="/projects/create"
          element={
            <RequireAuth>
              <ProjectCreatePage addProject={addProject} />
            </RequireAuth>
          }
        />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
