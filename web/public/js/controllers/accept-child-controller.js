'use strict';

function acceptChildController($scope, $stateParams, auth, $window, $location, usSpinnerService, cdUsersService, alertService, $state, $translate){
  var childProfileId, inviteToken, currentPath;

  childProfileId = $stateParams.childProfileId;
  inviteToken = $stateParams.inviteToken;

  usSpinnerService.spin('parent-guardian-request-spinner');

  var data = {
    childProfileId: childProfileId,
    inviteToken: inviteToken
  };

  var win = function(response, status){
    usSpinnerService.stop('parent-guardian-request-spinner');
    alertService.showAlert($translate.instant('Invitation Accepted'), function(){
      $state.go('home');
    });
  };

  var fail = function(err){
    usSpinnerService.stop('parent-guardian-request-spinner');
    alertService.showError($translate.instant('An error has occured while accepting invitation'));
  };

  cdUsersService.acceptParent(data, win, fail);

}

angular.module('cpZenPlatform')
  .controller('accept-child-controller', ['$scope',
  '$stateParams', 'auth', '$window', '$location',
  'usSpinnerService', 'cdUsersService', 'alertService', '$state', '$translate', acceptChildController]);
