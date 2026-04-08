import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider break-words sm:truncate sm:whitespace-nowrap">{title}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
                {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 break-words sm:truncate">{subtitle}</p>}
            </div>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${color} flex items-center justify-center shrink-0 sm:ml-3 self-start`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
        </div>
    </motion.div>
);

export default StatCard;
