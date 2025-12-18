import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import VisaTypeForm from "../../components/admin/VisaTypeForm";

function VisaTypes() {
  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisaType, setEditingVisaType] = useState(null);
  const [filters, setFilters] = useState({
    country: "",
    is_active: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  useEffect(() => {
    loadVisaTypes();
  }, [filters, pagination.current_page]);

  const loadVisaTypes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });

      const res = await apiRequest(`/api/admin/visa-types?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVisaTypes(data.data);
        setPagination(data.meta);
      }
    } catch (error) {
      console.error("Ошибка загрузки типов виз:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот тип визы?")) {
      return;
    }

    try {
      const res = await apiRequest(`/api/admin/visa-types/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadVisaTypes();
      }
    } catch (error) {
      console.error("Ошибка удаления:", error);
      alert("Не удалось удалить тип визы");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVisaType(null);
    loadVisaTypes();
  };

  const handleEdit = (visaType) => {
    setEditingVisaType(visaType);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingVisaType(null);
    setShowForm(true);
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-700">Типы виз</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            + Создать тип визы
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Поиск..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            className="py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
          />
          <input
            type="text"
            placeholder="Страна"
            value={filters.country}
            onChange={(e) =>
              setFilters({ ...filters, country: e.target.value })
            }
            className="py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
          />
          <select
            value={filters.is_active}
            onChange={(e) =>
              setFilters({ ...filters, is_active: e.target.value })
            }
            className="py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="">Все статусы</option>
            <option value="1">Активные</option>
            <option value="0">Неактивные</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-blue-400">Загрузка...</div>
        ) : visaTypes.length === 0 ? (
          <div className="p-8 text-center text-blue-400">
            Типы виз не найдены
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Код
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Страна
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {visaTypes.map((visaType) => (
                  <tr key={visaType.id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono">
                      {visaType.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                      {visaType.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                      {visaType.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          visaType.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {visaType.is_active ? "Активен" : "Неактивен"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(visaType)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(visaType.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="px-6 py-4 border-t border-blue-100 flex items-center justify-between">
                <div className="text-sm text-blue-400">
                  Показано {visaTypes.length} из {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        current_page: pagination.current_page - 1,
                      })
                    }
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 border border-blue-200 rounded text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1 text-blue-700">
                    {pagination.current_page} / {pagination.last_page}
                  </span>
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        current_page: pagination.current_page + 1,
                      })
                    }
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-1 border border-blue-200 rounded text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <VisaTypeForm
          visaType={editingVisaType}
          onClose={() => {
            setShowForm(false);
            setEditingVisaType(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

export default VisaTypes;

