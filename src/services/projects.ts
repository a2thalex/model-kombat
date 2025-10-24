import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, Timestamp } from 'firebase/firestore'
import { db, auth } from './firebase'
import { Project } from '@/types'

class ProjectsService {
  private readonly collectionName = 'projects'

  async createProject(projectData: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User must be authenticated to create a project')
    }

    const newProject = {
      ...projectData,
      userId: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, this.collectionName), newProject)
    return docRef.id
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User must be authenticated to update a project')
    }

    const projectRef = doc(db, this.collectionName, projectId)

    // Verify ownership
    const projectDoc = await getDoc(projectRef)
    if (!projectDoc.exists()) {
      throw new Error('Project not found')
    }

    const projectData = projectDoc.data()
    if (projectData.userId !== user.uid) {
      throw new Error('Unauthorized: You can only update your own projects')
    }

    await updateDoc(projectRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projectRef = doc(db, this.collectionName, projectId)
    const projectDoc = await getDoc(projectRef)

    if (!projectDoc.exists()) {
      return null
    }

    return {
      id: projectDoc.id,
      ...projectDoc.data()
    } as Project
  }

  async getUserProjects(): Promise<Project[]> {
    const user = auth.currentUser
    if (!user) {
      return []
    }

    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const projects: Project[] = []

    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      } as Project)
    })

    return projects
  }

  async deleteProject(projectId: string): Promise<void> {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User must be authenticated to delete a project')
    }

    const projectRef = doc(db, this.collectionName, projectId)

    // Verify ownership
    const projectDoc = await getDoc(projectRef)
    if (!projectDoc.exists()) {
      throw new Error('Project not found')
    }

    const projectData = projectDoc.data()
    if (projectData.userId !== user.uid) {
      throw new Error('Unauthorized: You can only delete your own projects')
    }

    await deleteDoc(projectRef)
  }
}

export const projectsService = new ProjectsService()