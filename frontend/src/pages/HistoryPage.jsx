import { useEffect, useState } from "react";
import deployService from "../services/deployService";
import useToast from "../hooks/useToast";
import { getErrorMessage } from "../utils/errorHandler";
import Table from "../components/common/Table";
import Badge, { statusVariant } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";
import { formatDate } from "../utils/formatDate";

/**
 * Historial global de todos los deploys.
 */
function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toastError } = useToast();

  useEffect(() => {
    let cancelled = false;
    deployService
      .getGlobalHistory()
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError(getErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const columns = [
    {
      key: "jobId",
      label: "Job ID",
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">{val}</span>
      ),
    },
    {
      key: "projectName",
      label: "Proyecto",
      render: (val) => (
        <span className="font-medium text-white">{val ?? "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (val) => (
        <Badge label={val} variant={statusVariant[val] ?? "gray"} />
      ),
    },
    {
      key: "createdAt",
      label: "Iniciado",
      render: (val) => (val ? formatDate(val) : "—"),
    },
    {
      key: "finishedAt",
      label: "Finalizado",
      render: (val) => (val ? formatDate(val) : "—"),
    },
  ];

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Historial de deploys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Registro de todos los despliegues realizados
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : (
        <div className="card p-0">
          <Table
            columns={columns}
            data={history}
            emptyMessage="No hay deploys registrados todavía."
          />
        </div>
      )}
    </section>
  );
}

export default HistoryPage;
