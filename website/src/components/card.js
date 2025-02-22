// components/Card.js
import PropTypes from 'prop-types';

const Card = ({ cardNumber }) => {
  return (
    <div className="flex flex-col justify-center items-center aspect-[64/89] h-full rounded-lg border-2 border-gray-200 shadow-lg p-6 bg-gray-50 hover:bg-gray-100 hover:shadow-xl hover:scale-105 cursor-pointer transition-all duration-300">
      <div className="flex-grow flex items-center justify-center text-center font-medium text-gray-800 text-[10vh] h-full">
        {cardNumber}
      </div>
    </div>
  );
};

Card.propTypes = {
  cardNumber: PropTypes.number.isRequired,
};

export default Card;
