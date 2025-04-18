"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

type SortOption = "abjad-asc" | "time-asc";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("time-asc");
  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const tasksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  const calculateTimeRemaining = useCallback((deadline: string): number => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    return deadlineTime - now;
  }, []);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "waktu habis";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}j ${minutes}m ${seconds}d`;
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    switch (sortOption) {
      case "abjad-asc":
        sorted.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case "time-asc":
        sorted.sort(
          (a, b) => calculateTimeRemaining(a.deadline) - calculateTimeRemaining(b.deadline)
        );
        break;
    }
    return sorted;
  }, [tasks, sortOption, calculateTimeRemaining]);

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambah Kegiatan",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama kegiatan">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTask }]);
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil ditambahkan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const editTask = async (task: Task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Kegiatan",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama kegiatan">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const taskRef = doc(db, "tasks", task.id);
      try {
        await updateDoc(taskRef, {
          text: formValues[0],
          deadline: formValues[1],
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, text: formValues[0], deadline: formValues[1] }
              : t
          )
        );
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil diubah.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Tugas yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, completed: !task.completed };
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await updateDoc(doc(db, "tasks", id), { completed: updated.completed });
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6 text-black">
        💥 TO DO LIST 💥
      </h1>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <button
          onClick={addTask}
          className="bg-blue-800 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl"
        >
          TAMBAH TUGAS
        </button>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          <option value="abjad-asc">Sort by name</option>
          <option value="time-asc">Sort by time</option>
        </select>
      </div>

      <div className="bg-blue-900 text-white rounded-xl px-6 py-4">
        <div className="grid grid-cols-5 gap-4 font-semibold text-center mb-3">
          <div className="col-span-2">tugas</div>
          <div>deadline</div>
          <div>sisa waktu</div>
          <div>aksi</div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-4">Belum ada tugas ditambahkan</div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence>
              {sortedTasks.map((task) => {
                const timeLeftMs = calculateTimeRemaining(task.deadline);
                const timeLeftFormatted = formatTimeRemaining(timeLeftMs);

                return (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-5 gap-4 items-center text-center bg-white text-black rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center justify-start col-span-2 gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleComplete(task.id)}
                        className="form-checkbox h-4 w-4"
                      />
                      <span
                        className={`${task.completed
                            ? "line-through text-gray-400"
                            : "text-black"
                          }`}
                      >
                        {task.text}
                      </span>
                    </div>
                    <div>{new Date(task.deadline).toLocaleDateString()}</div>
                    <div
                      className={`${task.completed
                          ? "text-green-600 font-semibold"
                          : timeLeftFormatted === "waktu habis"
                            ? "text-red-600 font-semibold"
                            : ""
                        }`}
                    >
                      {task.completed ? "selesai" : timeLeftFormatted}
                    </div>

                    <div className="flex justify-center gap-3 text-sm">
                      <button
                        onClick={() => editTask(task)}
                        className="hover:underline"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="hover:underline"
                      >
                        hapus
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
