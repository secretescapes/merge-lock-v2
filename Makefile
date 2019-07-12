.PHONY: deploy_app deploy_responses_app deploy clean

deploy: clean deploy_app deploy_responses_app

deploy_app:
	cd release-bot-service && \
	serverless deploy --stage test \
	| egrep -o '(https://.{10}.execute-api.[^\.]*.amazonaws.com/[^\/]*)' \
	| uniq \
	| xargs printf "TEST_APP_URL=%s\n" >> ../.env

deploy_responses_app: 
	cd release-bot-test-service && \
	serverless deploy --stage dev \
	| egrep -o '(https://.{10}.execute-api.[^\.]*.amazonaws.com/[^\/]*)' \
	| uniq \
	| xargs printf "RESPONSES_APP_URL=%s\n" >> ../.env


clean:
	rm -f .env