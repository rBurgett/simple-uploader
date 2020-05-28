import PropTypes from 'prop-types';
import React from 'react';
import { activeViews } from '../../constants';

const Header = ({ activeView, disabled = false, setActiveView }) => {

  const styles = {
    container: {
      padding: 12
    },
    button: {
      boxShadow: 'none'
    }
  };

  const onClick = (e, view) => {
    e.preventDefault();
    setActiveView(view);
  };

  return (
    <div style={styles.container} className="btn-group dashhead-toolbar-item btn-group-thirds">
      <button disabled={disabled} type="button" style={styles.button} className={`btn btn-outline-primary ${activeView === activeViews.UPLOAD ? 'active' : ''}`} onClick={e => onClick(e, activeViews.UPLOAD)}>Upload</button>
      <button disabled={disabled} type="button" style={styles.button} className={`btn btn-outline-primary ${activeView === activeViews.FILES ? 'active' : ''}`} onClick={e => onClick(e, activeViews.FILES)}>Files</button>
      <button disabled={disabled} type="button" style={styles.button} className={`btn btn-outline-primary ${activeView === activeViews.SETTINGS ? 'active' : ''}`} onClick={e => onClick(e, activeViews.SETTINGS)}>Settings</button>
    </div>
  );
};
Header.propTypes = {
  activeView: PropTypes.string,
  disabled: PropTypes.bool,
  setActiveView: PropTypes.func
};

export default Header;
