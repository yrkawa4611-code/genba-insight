import { useState } from "react";
import { projects as initialProjects, } from './data/projects';

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ProjectListPage from "./pages/ProjectListPage";
import "./App.css";
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectCreatePage from "./pages/ProjectCreatePage";
import ProjectEditPage from "./pages/ProjectEditPage";

function App() {

  const [ projects, setProjects] = useState(initialProjects);

  const addProject = (project: {
    id: number;
    address: string;
    structure: string;
    areaTsubo: number;
    contractPrice: number;
    cost: number;
  }) => {
    setProjects([...projects, project]);
  };

  const updateProject = (updatedProject: {
    id: number;
  address: string;
  structure: string;
  areaTsubo: number;
  contractPrice: number;
  cost: number;
  }) => {
    setProjects(
      projects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  };

  const deleteProject = (id: number) => {
    setProjects(
      projects.filter((project) => project.id !== id)
    );
  };
  return (

    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/projects"
          element={<ProjectListPage projects={projects}/>}
        />
        <Route
          path="/projects/:id"
          element={
            <ProjectDetailPage
              projects={projects} 
              deleteProject={deleteProject}
            />
          } 
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProjectEditPage
              projects={projects}
              updateProject={updateProject} 
            />
          }
        />
        <Route
          path="/projects/create"
          element={<ProjectCreatePage addProject={addProject} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;