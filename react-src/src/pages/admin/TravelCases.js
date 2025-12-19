import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import TravelCaseForm from "../../components/admin/TravelCaseForm";
import ConfirmModal from "../../components/common/ConfirmModal";
import { useToastContext } from "../../contexts/ToastContext";

function TravelCases() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [travelCases, setTravelCases] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [filters, setFilters] = useState({
    visa_type_id: "",
    status: "",
    search: "",
    date_from: "",
    date_to: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  useEffect(() => {
    loadVisaTypes();
  }, []);

  useEffect(() => {
    loadTravelCases();
  }, [filters, pagination.current_page]);

  const loadVisaTypes = async () => {
    try {
      const res = await apiRequest("/api/admin/visa-types/active/list");
      if (res.ok) {
        const data = await res.json();
        setVisaTypes(data.data);
      }
    } catch (error) {
      console.error("Ошибка загрузки типов виз:", error);
    }
  };

  const loadTravelCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });

      const res = await apiRequest(`/api/admin/travel-cases?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTravelCases(data.data);
        setPagination(data.meta);
      }
    } catch (error) {
      console.error("Ошибка загрузки заявок:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    if (!id) return;

    try {
      const res = await apiRequest(`/api/admin/travel-cases/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Заявка успешно удалена");
        loadTravelCases();
      } else {
        const data = await res.json();
        throw new Error(data?.error?.message || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка удаления:", error);
      toast.error(error.message || "Не удалось удалить заявку");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCase(null);
    loadTravelCases();
  };

  const handleEdit = (travelCase) => {
    setEditingCase(travelCase);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingCase(null);
    setShowForm(true);
  };

  const handleView = async (id) => {
    try {
      const res = await apiRequest(`/api/admin/travel-cases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data.data);
      }
    } catch (error) {
      console.error("Ошибка загрузки заявки:", error);
    }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    toast.success("Токен скопирован в буфер обмена");
  };

  const copyFormLink = (token) => {
    const link = `${window.location.origin}/form/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Ссылка на форму скопирована в буфер обмена");
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: "bg-blue-100 text-blue-700",
      filled: "bg-green-100 text-green-700",
      archived: "bg-gray-100 text-gray-700",
    };
    return badges[status] || badges.new;
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: "Новая",
      filled: "Заполнена",
      archived: "Архив",
    };
    return labels[status] || status;
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-700">Заявки на визы</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            + Создать заявку
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Поиск (токен, тип визы)..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none min-w-0"
          />
          <select
            value={filters.visa_type_id}
            onChange={(e) =>
              setFilters({ ...filters, visa_type_id: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none min-w-0"
          >
            <option value="">Все типы виз</option>
            {visaTypes.map((vt) => (
              <option key={vt.id} value={vt.id}>
                {vt.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none min-w-0"
          >
            <option value="">Все статусы</option>
            <option value="new">Новая</option>
            <option value="filled">Заполнена</option>
            <option value="archived">Архив</option>
          </select>
          <div className="flex gap-2 min-w-0">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) =>
                setFilters({ ...filters, date_from: e.target.value })
              }
              className="flex-1 min-w-0 py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="От"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) =>
                setFilters({ ...filters, date_to: e.target.value })
              }
              className="flex-1 min-w-0 py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="До"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-blue-400">Загрузка...</div>
        ) : travelCases.length === 0 ? (
          <div className="p-8 text-center text-blue-400">Заявки не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Токен
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Тип визы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Шаблон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Создана
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {travelCases.map((travelCase) => (
                  <tr key={travelCase.id} className="hover:bg-blue-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <code className="text-sm text-blue-700 font-mono truncate">
                          {travelCase.public_token.substring(0, 12)}...
                        </code>
                        <button
                          onClick={() => copyFormLink(travelCase.public_token)}
                          className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                          title="Копировать ссылку на форму"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700 max-w-[200px]">
                      <div className="truncate" title={travelCase.visa_type?.name}>
                        {travelCase.visa_type?.name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700 max-w-[200px]">
                      <div className="truncate" title={travelCase.form_template?.name}>
                        {travelCase.form_template?.name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${getStatusBadge(
                          travelCase.status
                        )}`}
                      >
                        {getStatusLabel(travelCase.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-400 whitespace-nowrap">
                      {travelCase.created_at
                        ? new Date(travelCase.created_at).toLocaleDateString(
                            "ru-RU"
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleView(travelCase.id)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Просмотр
                      </button>
                      <button
                        onClick={() => handleEdit(travelCase)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteClick(travelCase.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && travelCases.length > 0 && pagination.last_page > 1 && (
          <div className="px-6 py-4 border-t border-blue-100 flex items-center justify-between">
            <div className="text-sm text-blue-400">
              Показано {travelCases.length} из {pagination.total}
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
      </div>

      {showForm && (
        <TravelCaseForm
          travelCase={editingCase}
          onClose={() => {
            setShowForm(false);
            setEditingCase(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {selectedCase && (
        <TravelCaseView
          travelCase={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Подтверждение удаления"
        message="Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
      />
    </div>
  );
}

function TravelCaseView({ travelCase, onClose }) {
  const toast = useToastContext();

  const copyToken = () => {
    navigator.clipboard.writeText(travelCase.public_token);
    toast.success("Токен скопирован в буфер обмена");
  };

  const copyFormLink = () => {
    const link = `${window.location.origin}/form/${travelCase.public_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Ссылка на форму скопирована в буфер обмена");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-6xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-blue-100 flex-shrink-0">
          <h2 className="text-2xl font-bold text-blue-700">
            Детали заявки #{travelCase.id}
          </h2>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-600"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-blue-400">Токен</label>
                <div className="space-y-2 mt-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-blue-700 font-mono break-all">
                      {travelCase.public_token}
                    </code>
                    <button
                      onClick={copyToken}
                      className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                      title="Копировать токен"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs text-blue-400 font-mono break-all flex-1">
                      {window.location.origin}/form/{travelCase.public_token}
                    </code>
                    <button
                      onClick={copyFormLink}
                      className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                      title="Копировать ссылку на форму"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            <div>
              <label className="text-sm text-blue-400">Статус</label>
              <div className="mt-1">
                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                  {travelCase.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-blue-400">Тип визы</label>
              <div className="mt-1 text-blue-700">
                {travelCase.visa_type?.name || "—"}
              </div>
            </div>
            <div>
              <label className="text-sm text-blue-400">Шаблон формы</label>
              <div className="mt-1 text-blue-700">
                {travelCase.form_template?.name || "—"}
              </div>
            </div>
            <div>
              <label className="text-sm text-blue-400">Создана</label>
              <div className="mt-1 text-blue-700">
                {travelCase.created_at
                  ? new Date(travelCase.created_at).toLocaleString("ru-RU")
                  : "—"}
              </div>
            </div>
            {travelCase.filled_at && (
              <div>
                <label className="text-sm text-blue-400">Заполнена</label>
                <div className="mt-1 text-blue-700">
                  {new Date(travelCase.filled_at).toLocaleString("ru-RU")}
                </div>
              </div>
            )}
          </div>

          {travelCase.form_responses && travelCase.form_responses.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-blue-700 mb-4">
                Ответы на форму
              </h3>
              {travelCase.form_responses.map((response, index) => (
                <div
                  key={response.id}
                  className="bg-blue-50 rounded-lg p-4 mb-4"
                >
                  <div className="text-sm text-blue-400 mb-2">
                    Ответ #{index + 1} от{" "}
                    {response.submitted_at
                      ? new Date(response.submitted_at).toLocaleString("ru-RU")
                      : new Date(response.created_at).toLocaleString("ru-RU")}
                  </div>
                  <div className="bg-white p-3 rounded overflow-x-auto">
                    <pre className="text-sm text-blue-700 max-w-full break-words whitespace-pre-wrap">
                      {JSON.stringify(response.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}

            {(!travelCase.form_responses ||
              travelCase.form_responses.length === 0) && (
              <div className="text-center text-blue-400 py-8">
                Ответы на форму пока не получены
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-blue-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export default TravelCases;

