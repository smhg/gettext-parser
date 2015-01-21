#!/bin/sh

rm fixtures/hugeUtf8-po.json
rm fixtures/hugeUtf8.po

cat fixtures/hugeHeader.po > fixtures/hugeUtf8.po
cat fixtures/hugeHeader.json > fixtures/hugeUtf8-po.json

count=0

while [ $count -lt 5000 ]                     # while count is greater than 10 do
do
  count=$(expr $count + 1)
  echo """ ,\"key$count\": {
    \"msgid\": \"key$count\",
    \"msgstr\": [
    \"t$count\"
    ]
  } """ >> fixtures/hugeUtf8-po.json
  
  echo "msgid \"key$count\"\nmsgstr \"t$count\"" >> fixtures/hugeUtf8.po
done

echo "}}}" >> fixtures/hugeUtf8-po.json

echo Created $count keys .po files and matching .json