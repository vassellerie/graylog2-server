import PropTypes from 'prop-types';
import React from 'react';
import Immutable from 'immutable';
import lodash from 'lodash';
import { Col, ListGroup, ListGroupItem, Row } from 'react-bootstrap';

import { Input } from 'components/bootstrap';
import { TypeAheadDataFilter } from 'components/common';

import style from './TableList.css';

/**
 * Component that renders a list of items in a table-like structure. The list
 * also includes a filter input that can be used to search for specific
 * items or elements matching a string.
 *
 * The component can render action elements for each item, and also for
 * performing bulk-operation. In that second case, action elements will
 * appear in the header once the user selects more than one item by clicking
 * in the checkboxes next to them.
 */
const TableList = React.createClass({
  propTypes: {
    /** Specifies key to use as item ID. */
    idKey: PropTypes.string,
    /** Specifies a key to use as item title. */
    titleKey: PropTypes.string,
    /** Specifies key to use as item description. */
    descriptionKey: PropTypes.string,
    /** Object keys to use for filtering. Use an empty array to disable filtering. */
    filterKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    /** Label to use next to the filter input. */
    filterLabel: PropTypes.string,
    /**
     * Immutable List of objects to display in the list. Objects are expected
     * to have an ID (`idKey` prop), a title (`title` prop), and an optional
     * description (`descriptionKey` prop).
     */
    items: PropTypes.instanceOf(Immutable.List).isRequired,
    /**
     * Function that generates react elements to render in the header.
     * Those elements are meant to display actions that affect more than one
     * item in the list, so they will only be displayed when one or more items
     * are checked.
     * The function receives a list of IDs corresponding to all selected
     * elements as argument.
     */
    headerActionsFactory: PropTypes.func,
    /**
     * Function that generates react elements to render for each item.
     * Those elements are meant to display actions that affect that specific
     * item.
     * The function will receive the whole item object as an argument.
     */
    itemActionsFactory: PropTypes.func,
  },
  getDefaultProps() {
    return {
      idKey: 'id',
      titleKey: 'title',
      descriptionKey: 'description',
      filterLabel: 'Filter',
      headerActionsFactory: () => {},
      itemActionsFactory: () => {},
    };
  },
  getInitialState() {
    return {
      filteredItems: this.props.items,
      selected: Immutable.Set(),
    };
  },

  componentDidUpdate() {
    const { filteredItems, selected } = this.state;
    this._setSelectAllCheckboxState(this.selectAllInput, filteredItems, selected);
  },

  _setSelectAllCheckboxState(selectAllInput, filteredItems, selected) {
    const selectAllCheckbox = selectAllInput ? selectAllInput.getInputDOMNode() : undefined;
    if (!selectAllCheckbox) {
      return;
    }
    // Set the select all checkbox as indeterminate if some but not items are selected.
    selectAllCheckbox.indeterminate = selected.count() > 0 && !this._isAllSelected(filteredItems, selected);
  },

  _recalculateSelection(selected, nextFilteredItems) {
    const nextFilteredIds = Immutable.Set(nextFilteredItems.map(item => item[this.props.idKey]));
    return selected.intersect(nextFilteredIds);
  },

  _filterItems(filteredItems) {
    const nextFilteredItems = Immutable.List(filteredItems);
    const filteredSelected = this._recalculateSelection(this.state.selected, nextFilteredItems);
    this.setState({ filteredItems: nextFilteredItems, selected: filteredSelected });
  },

  _isAllSelected(filteredItems, selected) {
    return filteredItems.count() > 0 && filteredItems.count() === selected.count();
  },

  _headerItem() {
    const { filteredItems, selected } = this.state;
    const selectedItems = selected.count();
    let bulkHeaderActions;

    if (selectedItems > 0) {
      bulkHeaderActions = this.props.headerActionsFactory(this.state.selected);
    }

    const header = (
      <div>
        <div className={style.headerComponentsWrapper}>
          {bulkHeaderActions}
        </div>

        <Input ref={(c) => { this.selectAllInput = c; }}
               id="select-all-checkbox"
               type="checkbox"
               label={selectedItems === 0 ? 'Select all' : `${selectedItems} selected`}
               disabled={filteredItems.count() === 0}
               checked={this._isAllSelected(filteredItems, selected)}
               onChange={this._toggleSelectAll}
               wrapperClassName="form-group-inline" />
      </div>
    );
    return <ListGroupItem className="list-group-header" header={header} />;
  },
  _toggleSelectAll(event) {
    const newSelected = event.target.checked ? Immutable.Set(this.state.filteredItems.map(item => item[this.props.idKey])) : Immutable.Set();
    this.setState({ selected: newSelected });
  },
  _formatItem(item) {
    const header = (
      <div className={style.itemWrapper}>
        <div className={style.itemActionsWrapper}>
          {this.props.itemActionsFactory(item)}
        </div>

        <Input id={`${this.props.idKey}-checkbox`}
               type="checkbox"
               label={item[this.props.titleKey]}
               checked={this.state.selected.includes(item[this.props.idKey])}
               onChange={this._onItemSelect(item[this.props.idKey])}
               wrapperClassName="form-group-inline" />
      </div>
    );
    return (
      <ListGroupItem key={`item-${item[this.props.idKey]}`} header={header}>
        <span className={style.description}>{item[this.props.descriptionKey]}</span>
      </ListGroupItem>
    );
  },
  _onItemSelect(id) {
    return (event) => {
      const newSelected = event.target.checked ? this.state.selected.add(id) : this.state.selected.delete(id);
      this.setState({ selected: newSelected });
    };
  },
  render() {
    if (this.props.items.count() === 0) {
      return (
        <Row>
          <Col md={12}>
            <div>No items to display.</div>
          </Col>
        </Row>
      );
    }

    const formattedItems = this.state.filteredItems.map(item => this._formatItem(item)).toJS();
    let filter;

    if (this.props.filterKeys.length !== 0) {
      filter = (
        <Row>
          <Col md={5}>
            <TypeAheadDataFilter id={`${lodash.kebabCase(this.props.filterLabel)}-data-filter`}
                                 label={this.props.filterLabel}
                                 data={this.props.items.toJS()}
                                 displayKey="value"
                                 filterSuggestions={[]}
                                 searchInKeys={this.props.filterKeys}
                                 onDataFiltered={this._filterItems} />
          </Col>
        </Row>
      );
    }

    if (this.state.filteredItems.count() === 0) {
      return (
        <div>
          {filter}
          <div>No items match your filter criteria</div>
        </div>
      );
    }

    return (
      <div>
        {filter}
        <ListGroup>
          {this._headerItem()}
          {formattedItems}
        </ListGroup>
      </div>
    );
  },
});

export default TableList;
