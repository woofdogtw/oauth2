/**
 * This module integrates all model functions for OAuth2, user, client
 * management.
 *
 * @module model/sqlite3/Index
 */
'use strict';

const authCode = require('./auth-code');
const client   = require('./client');
const token    = require('./token');
const user     = require('./user');

module.exports.oauth = {
  generateAccessToken: token.generateAccessToken,
  generateRefreshToken: token.generateRefreshToken,
  generateAuthorizationCode: authCode.generateAuthorizationCode,
  getAccessToken: token.getAccessToken,
  getRefreshToken: token.getRefreshToken,
  getAuthorizationCode: authCode.getAuthorizationCode,
  getClient: client.getClientByIdSecret,
  getUser: user.getUserByNamePass,
  getUserFromClient: client.getUserFromClient,
  saveToken: token.saveToken,
  saveAuthorizationCode: authCode.saveAuthorizationCode,
  revokeToken: token.revokeToken,
  revokeAuthorizationCode: authCode.revokeAuthorizationCode,
  validateScope: client.validateScope,
  verifyScope: client.verifyScope
};

module.exports.user = {
  getUserCount: user.getUserCount,
  getUserList: user.getUserList,
  getUser: user.getUser,
  addUser: user.addUser,
  rmUser: user.rmUser,
  updateUser: user.updateUser
};

module.exports.client = {
  getClientCount: client.getClientCount,
  getClientList: client.getClientList,
  getClient: client.getClient,
  addClient: client.addClient,
  rmClient: client.rmClient,
  rmClientUser: client.rmClientUser,
  updateClient: client.updateClient
};

module.exports.token = {
  rmAccessToken: token.rmAccessToken
};
