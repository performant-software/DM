/* global require */
const { applyMiddleware, createStore, compose } = require("redux");
const { logger } = require("redux-logger");
const { createAction, handleAction } = require("redux-actions");

const log = createAction("LOG");

const reducer = handleAction(
    log,
    (state, action) => [ ...state, action.payload],
    []
);

const store = createStore(reducer, applyMiddleware(logger));
const dispatch = store.dispatch.bind(store);

Object.assign(window.DM || (window.DM = {}), {
    store,
    log: compose(dispatch, log)
});
