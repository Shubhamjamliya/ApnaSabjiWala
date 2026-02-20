import { useState, useEffect } from "react";
import { getHomeSections, type HomeSection } from "../../../services/api/admin/adminHomeSectionService";
import { getPageConfig, updatePageConfig } from "../../../services/api/admin/adminPageConfigService";
import { useToast } from "../../../context/ToastContext";
import ContentLoader from "../../../components/loaders/ContentLoader";

export default function AdminNextDaySections() {
  const { showToast } = useToast();
  const [allSections, setAllSections] = useState<HomeSection[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sectionsRes, configRes] = await Promise.all([
        getHomeSections({ skipLoader: true }),
        getPageConfig("NEXT_DAY")
      ]);

      if (sectionsRes.success && Array.isArray(sectionsRes.data)) {
        setAllSections(sectionsRes.data);
      }

      if (configRes.success && configRes.data.sections) {
        // Extracts IDs from the populated objects
        const currentIds = configRes.data.sections.map((s: any) => s._id || s);
        setSelectedSectionIds(currentIds);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await updatePageConfig("NEXT_DAY", selectedSectionIds);
      if (res.success) {
        showToast("Next Day sections updated successfully!", "success");
      } else {
        showToast(res.message || "Failed to update", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("An error occurred while saving", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ContentLoader />;

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Next Day Sections</h1>
          <p className="text-gray-500 text-sm mt-1">Select which Home Sections to display on the Next Day Booking page.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">Available Sections</h2>
          <span className="text-sm text-gray-500">{selectedSectionIds.length} selected</span>
        </div>

        <div className="divide-y divide-gray-100">
          {allSections.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No sections found. Go to "Home Sections" to create some first.
            </div>
          ) : (
            allSections.map(section => (
              <div
                key={section._id}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${selectedSectionIds.includes(section._id) ? 'bg-emerald-50/50' : ''}`}
                onClick={() => handleToggleSection(section._id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedSectionIds.includes(section._id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
                    {selectedSectionIds.includes(section._id) && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{section.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase text-[10px] font-bold tracking-wider">{section.displayType}</span>
                      <span>• {section.columns} Columns</span>
                      {/* <span>• {section.headerCategory?.name || "Global"}</span> */}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${section.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                  {section.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
        <span className="font-bold text-blue-700">Tip:</span> The order of sections here is currently based on their selection order.
        Use the "Home Sections" page to update global order if needed, or we can add drag-and-drop support here later.
      </div>
    </div>
  );
}
