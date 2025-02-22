// components/Card.js
import PropTypes from 'prop-types';
const Stats = ({ statsValue }) => {
  let moneyBalance = 2
  let winRate = 0
  return (
    <div className="flex flex-col justify-center items-center aspect-[30/20] max-w-[30vh] w-full rounded-lg border-2 border-gray-200 shadow-lg p-6 bg-gray-50 hover:bg-gray-100 transition duration-300">
    <div className="flex-grow text-center font-semibold text-gray-800 text-[10vh]">
    <div className="mb-1">
          <span className="block text-l">Money Balance:</span>
          <span className="text-l">{"$" + moneyBalance}</span>
        </div>
        <div className="mb-1">
          <span className="block text-l">Win Rate:</span>
          <span className="text-l">{winRate}%</span>
        </div>
      </div>
    </div>
  );
};
Stats.propTypes = {
    moneyValue: PropTypes.number.isRequired,
};
export default Stats;
